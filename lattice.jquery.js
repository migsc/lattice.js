/*!
 * Lattice v0.5
 * A jQuery plugin to assemble organize HTML elements in a grid fashion and do other neat things.
 * Original author: @chateloinus
 * Licensed under the MIT license
 */


(function($) {
    
    $.fn.lattice = function(config) {

        /******************************
        * OPTIONS
        */

        // Take the options that the user selects, and merge them with defaults along with defaults for runtime data.
        var latt = $.extend({}, {
            //User selected
            startSelector: ">:first-child",
            debug: false,
            speed : 1000,
            pause : 3000,
            adjacentEasing: 'swing',
            nonAdjacentEasing: 'linear',
            thumnailMapEnabled : true,
            thumbnailWidth : 15,
            thumbnailHeight: 15,
            thumbnailSpacing: 3,
            adjacentLinkHideDuration: 200, 
            adjacentLinkShowDuration: 700,
            thumbnailMapHideDuration: 200,
            thumbnailMapShowDuration: 700,
            thumbnailActiveClass: 'lattice-thumbnail-active',
            containerClass: 'lattice-container',
            html : {
                wrapper:            '<div class="" style="position:relative;"></div>',
                thumbnailDefault:   '<div class="lattice-thumbnail"></div>',
                thumbnailEmpty:     '<div class"lattice-thumbnail empty"></div>',
                thumbnailMap:       '<div class="lattice-thumbnail-map" style="opacity:0.4;position:absolute;bottom:15px;right:15px"></div>',
                northArrow:         '<div style="left:50%;top:15px;position:absolute;opacity:0.4;width: 0;height:0;border-left:20px solid transparent;border-right: 20px solid transparent;border-bottom: 20px solid rgb(167, 161, 161);"></div>',
                eastArrow:          '<div style="top:50%;right:15px;position:absolute;opacity:0.4;width: 0;height: 0;border-top: 20px solid transparent;border-bottom: 20px solid transparent;border-left: 20px solid rgb(167, 161, 161);"></div>',
                southArrow:         '<div style="left:50%;bottom:15px;position:absolute;opacity:0.4;width:0;height:0;border-left:20px solid transparent;border-right:20px solid transparent;border-top:20px solid rgb(167, 161, 161);"></div>',
                westArrow:          '<div style="top:50%;left:15px;position:absolute;opacity:0.4;width: 0;height: 0;border-top: 20px solid transparent;border-bottom: 20px solid transparent; border-right:20px solid rgb(167, 161, 161); "></div>',
            },
            sliderWidth: '500px',
            sliderHeight: '400px',
            fullScreen: false,
            dynamicThumbnails: true,
            //Runtime data
            grid: [],
            currentPath: [],
            active:{
                row: null,
                col: null
            },
            inMotion: false,
            compassDict: {
                north : {
                    offsetR: -1,
                    offsetC: 0
                },
                south : {
                    offsetR: 1,
                    offsetC: 0
                },
                east : {
                    offsetR: 0,
                    offsetC: 1
                },
                west : {
                    offsetR: 0,
                    offsetC: -1
                }
            },
            keyDict: {
                '37' : 'west',
                '38' : 'north',
                '39' : 'east',
                '40' : 'south'
            }
        }, config);

        /******************************
        * SETUP
        */

        // If the pause is less than speed, it'll cause a flicker.
        // This will check for that, and if it is smaller, it increases it to just about the speed.
        if(latt.pause <= latt.speed) latt.pause = latt.speed + 100;
        
        // for each item in the wrapped set
        return this.each(function() {

            // cache "this."    
            var $this = $(this);

            latt.gridRows = getMaxData($this, "row");
            latt.gridCols = getMaxData($this, "col");
            latt.containerContext = $this.context;            

            // Wrap "this" in a div with a class and set some styles
            // Adjusting the "left" css values, so need to set positioning.
            $this.css({
                'position' : 'relative',
                'width': latt.sliderWidth,
                'height': latt.sliderHeight,
                'overflow': 'hidden',
            }).addClass(latt.containerClass);

            $this.children().css({
                'float' : 'left',
                'list-style' : 'none',
                'position': 'absolute',
                'height': '100%',
                'width': '100%',
                'display': 'none'
            });

            if(latt.fullScreen) {
                activateFullScreen(this);
            }

            //Add the thumbnail map
            if(latt.thumnailMapEnabled){
                $(latt.html.thumbnailMap).appendTo('.' + latt.containerClass)
                    .width(function(){
                        return ( latt.thumbnailWidth + ( 2 * latt.thumbnailSpacing ) ) * (latt.gridCols + 1);
                    }).height(function(){
                        return ( latt.thumbnailHeight + ( 2 * latt.thumbnailSpacing ) ) * (latt.gridRows + 1);
                    });
            }

            //Build the grid array while creating thumbnails and setting available paths along the way
            for(var rows = 0; rows <= latt.gridRows; rows++){
                latt.grid[rows] = [];
                for(var cols = 0; cols <= latt.gridCols; cols++){
                    
                    //Cache the reference to the cell's element
                    var $reference = $("[data-row=" + rows + "][data-col=" + cols + "]"),
                        clearValue = ( cols == latt.gridCols ) ? "right" : "none";

                    //If an element doesn't exist for this cell, we'll use the default empty placeholder
                   if($reference.length == 0){

                        setCellProperties(rows, cols, false);
                        addThumbnailToMap({
                                'background':'none'
                            }, latt.html.thumbnailEmpty, clearValue, $reference);
                        
                        continue;
                    }

                    //This element does exist. We'll create the thumbnail.
                    addThumbnailToMap({
                            'background-color': '#A7A1A1'
                        }, latt.html.thumbnailDefault, clearValue, $reference);

                    setCellProperties(rows, cols, {
                        element: $reference,
                        order: $reference.data("order"),
                        html: $('<div>').append($reference.clone()).html(),
                        row: parseInt($reference.data("row")),
                        col: parseInt($reference.data("col")),
                        visited: false,
                        north: false,
                        south: false,
                        east: false,
                        west: false
                    });

                    //Define available paths for that cell based on the travel data attribute
                    if ($reference.data("travel")){
                        
                        var travelParams = $reference.data("travel");
                        $.each(travelParams.split(","), function(index, value){
                            latt.grid[rows][cols][value] = true;
                            addAdjacentLink($reference, value);
                        });

                        continue;
                    }

                    //No path data attribute? Go by adjacency
                    for( direction in latt.compassDict ){
                        if (latt.compassDict.hasOwnProperty(direction)){
                            var adjacentCellSelector = 
                                "[data-row=" + ( rows + latt.compassDict[direction].offsetR ) 
                                + "][data-col=" + (cols + latt.compassDict[direction].offsetC) + "]";
                                travelProp = {};

                            if( $(adjacentCellSelector).length != 0  ) {
                                travelProp[direction] = true;
                                setCellProperties(rows, cols, travelProp );
                                addAdjacentLink($reference, direction);
                            } else {
                                travelProp[direction] = false;
                                setCellProperties(rows, cols, travelProp );
                            }
                            
                        }
                    }

                } //end col loop
            }//end row loop

            lattlog(latt);

            //Set the active slide
            var $active = $this.find(latt.startSelector);
            $active.toggleClass("active");
            latt.active.row = parseInt($active.data("row"));
            latt.active.col = parseInt($active.data("col"));
            updateActiveThumbnail(latt.active.row, latt.active.col);

            $('.' + latt.containerClass + ' .active').show();
            hideThumbnailMap();
            hideAdjacentLinks();

            /******************************
            * EVENTS
            */

            $(window).resize(function(){
                if(latt.fullScreen){
                    activateFullScreen(latt.containerContext);
                }
            });

            $(window).keyup(function(event){
    
                if(latt.inMotion || latt.keyDict[event.which] === undefined) {
                    return;
                }

                lattlog("KEYPRESS DETECTED: " + latt.keyDict[event.which]);

                latt.inMotion = true;
                
                var key = parseInt(event.which),
                    direction = latt.keyDict[event.which];
                var path = [latt.grid[latt.active.row][latt.active.col]],
                    row = latt.active.row + latt.compassDict[direction].offsetR,
                    col = latt.active.col + latt.compassDict[direction].offsetC;

                path[0].directionTaken = direction;
                latt.grid[row][col].directionTaken = direction;
                path.push(latt.grid[row][col]);
                
                lattlog(path);

                slideOn(path, false);

                return;
            })

            $(".active").mouseenter(function(){
                showAdjacentLinks();
                showThumbnailMap();
            });

            $(".active").mouseleave(function(){
                if( ! $('.lattice-thumbnail-map').is(':hover')){
                    hideThumbnailMap();
                    hideAdjacentLinks();
                }
            });

            $(".lattice-adjacent-link").click(function(e){
                e.preventDefault();
                if(latt.inMotion) return;
                else latt.inMotion = true;

                var hrefValue = $(this).attr('href'),
                    path = [latt.grid[latt.active.row][latt.active.col]];
                
                var direction = hrefValue.replace("#", "");
                path[0].directionTaken = direction;
                    
                switch(direction)
                {
                    case "north":
                        latt.grid[latt.active.row-1][latt.active.col].directionTaken = direction;
                        path.push(latt.grid[latt.active.row-1][latt.active.col]);
                        break;

                    case "east":
                        latt.grid[latt.active.row][latt.active.col+1].directionTaken = direction;
                        path.push(latt.grid[latt.active.row][latt.active.col+1]);
                        break;

                    case "south":
                        latt.grid[latt.active.row+1][latt.active.col].directionTaken = direction;
                        path.push(latt.grid[latt.active.row+1][latt.active.col]);
                        break;

                    case "west":
                        latt.grid[latt.active.row][latt.active.col-1].directionTaken = direction;
                        path.push(latt.grid[latt.active.row][latt.active.col-1])
                        break;

                    default:
                        return;
                        break;
                }

                lattlog(path);

                slideOn(path, false);

                return;
            });

            $(".lattice-grid-link").click(function(e){
                e.preventDefault();
                if(latt.inMotion) return;
                else latt.inMotion = true;

                var hrefValue = $(this).attr('href');
                hrefValue = hrefValue.replace("#", "");
                var coords = hrefValue.split("-");

                var path =  solveGrid({
                                row: latt.active.row,
                                col: latt.active.col
                            }, latt.grid[coords[0]][coords[1]], latt.grid);
                slideOn(path, true);                
                return;
            });

            /******************************
            * FUNCTIONS
            */

            function updateActiveThumbnail(row, col){
                $(".lattice-thumbnail-map ." + latt.thumbnailActiveClass).toggleClass( latt.thumbnailActiveClass );
                var selector = ".lattice-thumbnail-map .lattice-grid-link[href=#" + row + "-" + col + "] .lattice-thumbnail";
                $(selector).toggleClass(latt.thumbnailActiveClass);
            }

            function updateActivePanel(row, col){
                latt.active.row =  row;
                latt.active.col = col;
            }

            function hideAdjacentLinks(){
                $('.lattice-adjacent-link').hide(latt.adjacentLinkHideDuration);
            }

            function showAdjacentLinks(){
                $('.lattice-adjacent-link').show(latt.adjacentLinkShowDuration);
            }

            function hideThumbnailMap(){
                if(latt.fullScreen) return;
                $('.lattice-thumbnail-map').hide(latt.thumbnailMapHideDuration);
            }

            function showThumbnailMap(){
                $('.lattice-thumbnail-map').show(latt.thumbnailMapShowDuration).css('display','inline');
            }

            function slideOn(path, usePause){

                if (path.length > 1 || !path ) {

                    var index = 0,
                        pause = latt.speed;
                    var isAdjacentToDestination = ( index == path.length - 2 );

                    slideTo( path[index], path[index+1], false, isAdjacentToDestination);
                    index++;

                    window.setInterval(function(){
                        if( (index+1) == path.length){
                            return;
                        }

                        if( index == 0) {
                            pause = 0;
                        }

                        lattlog("Taking slide " +  index + " in the " + path[index].directionTaken + " direction.")
                        updateActiveThumbnail( path[index+1].row, path[index+1].col);

                        var prevNode = index > 0 ? path[index-1] : false,
                            isAdjacentToDestination = ( index == path.length - 2 );
                               
                        slideTo( path[index], path[index+1], prevNode, isAdjacentToDestination);

                        index++;

                    }, pause);
                    
                }

                
                latt.inMotion = false;
            }

            function slideTo(fromNode, toNode, prevNode, isAdjacentToDestination){

                var $current = $("[data-row=" + fromNode.row + "][data-col=" + fromNode.col + "]"),
                    $target = $("[data-row=" + toNode.row + "][data-col=" + toNode.col + "]"),
                    $prev = $("[data-row=" + prevNode.row + "][data-col=" + prevNode.col + "]");

                    $prev.removeAttr("style").css({
                            'float' : 'left',
                            'list-style' : 'none',
                            'position': 'absolute',
                            'height': '100%',
                            'width': '100%',
                            'display': 'none'
                        });

                    animOptions = [{}, {}, {}],
                    direction = compassToCss(fromNode.directionTaken);

                hideAdjacentLinks();

                $.each(animOptions, function(index, value){
                    animOptions[index][direction] = 0;
                });

                lattlog(isAdjacentToDestination);
                lattlog(direction);

                if(fromNode.directionTaken == 'west' || fromNode.directionTaken == 'east') {
                    animOptions[0][direction] = $current.width();
                    animOptions[1][direction] = -($current.width());
                } else {
                    animOptions[0][direction] = $current.height();
                    animOptions[1][direction] = -($current.height()); 
                }

                var easing = isAdjacentToDestination ? latt.adjacentEasing : latt.nonAdjacentEasing;
                lattlog(easing );
                
                $current.removeClass('active').animate(animOptions[0], latt.speed, easing);
                $target.addClass('active').show().css(animOptions[1]).animate(animOptions[2], latt.speed, easing, function(){
                    if(isAdjacentToDestination){
                        showAdjacentLinks();
                    }
                });

                latt.active.col = toNode.col;
                latt.active.row = toNode.row;
            }

            function createGrid(length) {
                var arr = new Array(length || 0),
                    i = length;

                if (arguments.length > 1) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    while(i--) arr[length-1 - i] = createArray.apply(this, args);
                }

                return arr;
            }

            function getMaxData($parent, name){
                return  $parent.children().map(function(){
                            return parseInt($(this).data(name));
                        }).get().sort(function(a, b) {
                            return b - a;
                        })[0];
            }

            function solveGrid(start, end, grid){
                lattlog("Starting solver.");
                var path = [];
                lattlog("Path initialized");
                if ( solveGridHelper( start, end, grid, path) != null ) {
                    resetGridVisits();
                    lattlog("Found a solution. Returning path.")
                    path.reverse();
                    return path;
                }

                resetGridVisits();
                lattlog("Solution not found! Returning null.")
                return null;
            }

            function solveGridHelper(start, end, grid,  path){

                lattlog("Currently at " + start.row + ":" + start.col);

                //Check if we're already at the goal
                if(coordsAreEqual(start, end)){
                    lattlog("We've reached the end!");
                    grid[start.row][start.col].visited =  true;
                    var pathNode =  grid[start.row][start.col];
                    pathNode.directionTaken = 'none';
                    path.push(pathNode);
                    return path;
                }

                var generallyTo = {
                        north : start.row > end.row,
                        east : start.col < end.col,
                        south : start.row < end.row,
                        west : start.col > end.col
                    };


                var compass = {
                        north: (start.row-1) < 0 ? false : grid[start.row-1][start.col],
                        south: (start.row+1) >= grid.length ? false  : grid[start.row+1][start.col],
                        east:  (start.col+1) >= grid[0].length ? false  : grid[start.row][start.col+1],
                        west:  (start.col-1) < 0 ? false  : grid[start.row][start.col-1],
                    };

                lattlog(generallyTo);
                
                for(var direction in generallyTo){
                    if(generallyTo[direction] && compass[direction]){
                        lattlog(compass[direction]);
                        lattlog("GENERAL BIAS: Checking " + compass[direction].row + ":" + compass[direction].col + " to the " + direction );
                        if(grid[start.row][start.col][direction] && compass[direction] && !compass[direction].visited) {
                            lattlog("Room is open. Going " + direction + ".");
                            grid[start.row][start.col].visited = true;
                            if( solveGridHelper(compass[direction], end, grid, path ) != null ){
                                var pathNode =  grid[start.row][start.col];
                                pathNode.directionTaken = direction;
                                path.push(pathNode);
                                return path;
                            }
                        }
                        lattlog("Closed.");
                    }
                }

                lattlog(compass);

                for (var direction in compass) {
                    if (compass.hasOwnProperty(direction) && compass[direction]) {
                        lattlog(compass[direction]);
                        lattlog("Checking " + compass[direction].row + ":" + compass[direction].col + " to the " + direction );
                        if(grid[start.row][start.col][direction] && compass[direction] && !compass[direction].visited) {
                            lattlog("Room is open. Going " + direction + ".");
                            grid[start.row][start.col].visited = true;
                            if( solveGridHelper(compass[direction], end, grid, path ) != null ){
                                var pathNode =  grid[start.row][start.col];
                                pathNode.directionTaken = direction;
                                path.push(pathNode);
                                return path;
                            }
                        }
                        lattlog("Closed.");
                    }
                }

                lattlog("Reached a dead end.");
                //If we get here, it's a dead end!
                return null;
            }

            function coordsAreEqual(coordOne, coordTwo){
                if(coordOne.row == coordTwo.row && coordOne.col == coordTwo.col){
                    return true;
                }
                return false;
            }

            function compassToCss(direction) {
                var compass = {
                    north: 'top',
                    south: 'bottom',
                    east: 'right',
                    west: 'left'
                };
                return compass[direction];
            }

            function cloneObject(o) {
                return $.extend({}, o);
            }

            function resetGridVisits() {
                for(var rows = 0; rows <= latt.gridRows; rows++){
                    for(var cols = 0; cols <= latt.gridCols; cols++){
                        latt.grid[rows][cols].visited = false;
                    }
                }
            }

            function activateFullScreen(context){
                $(context).css({
                    'width': '100%',
                    'height': '100%'
                });
                $('.' + latt.containerClass).css({
                    'width': window.innerWidth + 'px',
                    'height': $(window).height() + 'px'
                });
            }

            function createDynamicThumbnail($reference, rows, cols, thumbnail){
                var idSelector = "#" + $reference.attr("id");
                    html2canvas($(idSelector), {
                        onrendered: function(canvas, rows, cols) {
                            var image = new Image();
                            image.src = canvas.toDataURL("image/png");
                            image.style = "width:100%;height:100%;";

                            $(thumbnail).append(image).appendTo(".lattice-thumbnail-map").css({
                                'clear': clearValue,
                                'display': 'block',
                                'float': 'left',
                                'width': latt.thumbnailWidth + 'px',
                                'height': latt.thumbnailHeight + 'px',
                                'margin': latt.thumbnailSpacing + 'px'
                            })
                            wrapThumbnailInAnchor(thumbnail ,$reference);
                        }
                    });
            }

            function addThumbnailToMap(customCss, thumbnail, clearValue, $reference){
                $(thumbnail).appendTo(".lattice-thumbnail-map").css({
                    'clear': clearValue,
                    'display':'block',
                    'float': 'left',
                    'width': latt.thumbnailWidth + 'px',
                    'height': latt.thumbnailHeight + 'px',
                    'margin': latt.thumbnailSpacing + 'px'
                }).css(customCss).wrap(function(){
                    return '<a class="lattice-grid-link" href="#' 
                        + $reference.data('row')
                        + '-' 
                        + $reference.data('col')
                        + '" ></a>';
                });
            }

            function setCellProperties(row, col, props){
                
                if(!props){
                    latt.grid[row][col] = false;
                    return;
                }

                if( latt.grid[row][col] === undefined ){
                    latt.grid[row][col] = {};
                }

                for (var propName in props) {
                    if (props.hasOwnProperty(propName)) {
                        latt.grid[row][col][propName] = props[propName];
                    }
                }
            }

            function addAdjacentLink($reference, direction) {
                $reference.append(
                    '<a class="lattice-adjacent-link" href="#' + direction + '">' + latt.html[direction + 'Arrow'] + '</a>'
                );
            }

            function lattlog(mixed){
                if( latt.debug && window.console && window.console.log) {
                    console.log(mixed);
                }
            }


        }); // end each     
        
        return this;

    } // End plugin.

})(jQuery);