/*!
 * Lattice v0.1
 * A jQuery plugin to assemble organize HTML elements in a grid fashion and do other neat things.
 * Original author: @chateloinus
 * Licensed under the MIT license
 */


(function($) {
    
    $.fn.lattice = function(config) {

        // Take the options that the user selects, and merge them with defaults.
        var options = $.extend({}, {
            startSelector: ">:first-child",
            speed : 1000,
            pause : 3000,
            transition : 'fade',
            thumbnailWidth : 15,
            thumbnailHeight: 15,
            thumbnailSpacing: 3,
            defaultThumbnail :      '<div class="lattice-thumbnail"></div>',
            defaultThumbnailEmpty:  '<div class"lattice-thumbnail empty"></div>',
            northArrowHtml:         '<div style="left:50%;top:15px;position:absolute;opacity:0.4;width: 0;height:0;border-left:20px solid transparent;border-right: 20px solid transparent;border-bottom: 20px solid rgb(167, 161, 161);"></div>',
            eastArrowHtml:          '<div style="top:50%;right:15px;position:absolute;opacity:0.4;width: 0;height: 0;border-top: 20px solid transparent;border-bottom: 20px solid transparent;border-left: 20px solid rgb(167, 161, 161);"></div>',
            southArrowHtml:         '<div style="left:50%;bottom:15px;position:absolute;opacity:0.4;width:0;height:0;border-left:20px solid transparent;border-right:20px solid transparent;border-top:20px solid rgb(167, 161, 161);"></div>',
            westArrowHtml:          '<div style="top:50%;left:15px;position:absolute;opacity:0.4;width: 0;height: 0;border-top: 20px solid transparent;border-bottom: 20px solid transparent; border-right:20px solid rgb(167, 161, 161); "></div>',
        }, config);

        // Needed to fix a tiny bug. If the pause is less than speed, it'll cause a flickr.
        // This will check for that, and if it is smaller, it increases it to just about the options.speed.
        if(options.pause <= options.speed) options.pause = options.speed + 100;
        
        // for each item in the wrapped set
        return this.each(function() {

            // cache "this."    
            var $this = $(this);

            theGrid = {
                list: [],
                grid: [],
                currentPath: [],
                gridRows: getMaxData($this, "row"),
                gridCols: getMaxData($this, "col"),
                gridOrder: getMaxData($this, "order"),
                thumbnailMap: '<div class="lattice-thumbnail-map"></div>',
                active:{
                    row: null,
                    col: null
                },
                next: null
            };

            // Wrap "this" in a div with a class and set some styles
            // Set the width to a really high number. Adjusting the "left" css values, so need to set positioning.
            $this.wrap('<div class="lattice-wrap" />').css({
                'width' : '99999px',
                'position' : 'relative',
                'padding' : 0,
                'width': '500px',
                'height': '400px',
                'overflow': 'hidden',
            });

            $('.lattice-wrap').css({
                'position' : 'relative',
            });

            //Add the thumbnail map
            $(theGrid.thumbnailMap).appendTo('.lattice-wrap').css({
                'opacity': '0.4',
                'position': 'absolute',
                'bottom': '15px',
                'right': '15px',
            }).width(function(){
                return ( options.thumbnailWidth + ( 2 * options.thumbnailSpacing ) ) * (theGrid.gridCols + 1);
            }).height(function(){
                return ( options.thumbnailHeight + ( 2 * options.thumbnailSpacing ) ) * (theGrid.gridRows + 1);
            });

            //Build the grid
            for(var rows = 0; rows <= theGrid.gridRows; rows++){
                theGrid.grid[rows] = [];
                for(var cols = 0; cols <= theGrid.gridCols; cols++){
                    var $reference = $("[data-row=" + rows + "][data-col=" + cols + "]"),
                        clearValue = ( cols == theGrid.gridCols ) ? "right" : "none";
                    if($reference.length == 0){
                        theGrid.grid[rows][cols] = false;
                        $(options.defaultThumbnailEmpty).appendTo(".lattice-thumbnail-map").css({
                            'clear': clearValue,
                            'display':'block',
                            'background':'none',
                            'float': 'left',
                            'width': options.thumbnailWidth + 'px',
                            'height': options.thumbnailHeight + 'px',
                            'margin': options.thumbnailSpacing + 'px'
                        });
                        console.log(options.defaultThumbnailEmpty);
                    } else {
                        theGrid.grid[rows][cols] = {
                            element: $reference,
                            order: $reference.data("order"),
                            html: $('<div>').append($reference.clone()).html(),
                            row: parseInt($reference.data("row")),
                            col: parseInt($reference.data("col")),
                            visited: false,
                            north: null,
                            south: null,
                            east: null,
                            west: null
                        }
                        $(options.defaultThumbnail).appendTo(".lattice-thumbnail-map").css({
                            'clear': clearValue,
                            'display': 'block',
                            'float': 'left',
                            'background-color': '#A7A1A1',
                            'width': options.thumbnailWidth + 'px',
                            'height': options.thumbnailHeight + 'px',
                            'margin': options.thumbnailSpacing + 'px'
                        }).wrap(function(){
                            return '<a class="lattice-grid-link" href="#' 
                                + theGrid.grid[rows][cols].row
                                + '-' 
                                + theGrid.grid[rows][cols].col
                                + '"" ></a>';
                        });
                    }
                }    
            }

            //Define available paths for each grid
            for(var rows = 0; rows <= theGrid.gridRows; rows++){
                for(var cols = 0; cols <= theGrid.gridCols; cols++){
                    if(theGrid.grid[rows][cols]){
                        var $reference = $("[data-row=" + rows + "][data-col=" + cols + "]");
                        var travelParams = $reference.data("travel");
                        theGrid.grid[rows][cols].north = false;
                        theGrid.grid[rows][cols].south = false;
                        theGrid.grid[rows][cols].east = false;
                        theGrid.grid[rows][cols].west = false;
                        if (travelParams){
                            $.each(travelParams.split(","), function(index, value){
                                theGrid.grid[rows][cols][value] = true;
                                $reference.append('<a class="lattice-adjacent-link" href="' + value + '">' + options[ value + 'ArrowHtml' ] + '</a>');
                            });
                        } else {
                            if( (cols+1) <= theGrid.gridCols && theGrid.grid[rows][cols+1] !== false){
                                theGrid.grid[rows][cols].east = true;
                                $reference.append('<a class="lattice-adjacent-link" href="#east">' + options.eastArrowHtml + '</a>');
                            }
                            if( (rows+1) <= theGrid.gridRows && theGrid.grid[rows+1][cols] !== false) {
                                theGrid.grid[rows][cols].south = true;
                                $reference.append('<a class="lattice-adjacent-link" href="#south">' + options.southArrowHtml + '</a>');
                            }
                            if( (cols-1) >= 0 && theGrid.grid[rows][cols-1] !== false) {
                                theGrid.grid[rows][cols].west = true;
                                $reference.append('<a class="lattice-adjacent-link" href="#west">' + options.westArrowHtml + '</a>');
                            }
                            if( (rows-1) >= 0 && theGrid.grid[rows-1][cols] !== false) {
                                theGrid.grid[rows][cols].north = true;
                                $reference.append('<a class="lattice-adjacent-link" href="#north">' + options.northArrowHtml + '</a>');
                            }
                        }
                    }
                }
            }


            //Set the active slide
            var $active = $this.find(options.startSelector);
            $active.toggleClass("active");
            theGrid.active.row = parseInt($active.data("row"));
            theGrid.active.col = parseInt($active.data("col"));
            updateActiveThumbnail(theGrid.active.row, theGrid.active.col);
            console.log(theGrid.grid);
            

            // If the user chose the "slide" transition...
            if(options.transition === 'slide') {
                $this.children().css({
                    'float' : 'left',
                    'list-style' : 'none',
                    'position': 'absolute',
                    'height': '100%',
                    'width': '100%',
                    'display': 'none'
                });
                
                $('.lattice-wrap').css({
                    'width' : $this.children().width(),
                    'overflow' : 'hidden',
                });
                $('.lattice-wrap .active').show();
            }

            console.log(theGrid);
            
            // If the user instead chose the "slide" transition, call the slide function.
            //if(options.transition === 'slide') slide(); 

            $(".lattice-adjacent-link").click(function(e){
                e.preventDefault();
                var hrefValue = $(this).attr('href'),
                    path = [theGrid.grid[theGrid.active.row][theGrid.active.col]];
                
                var direction = hrefValue.replace("#", "");
                path[0].directionTaken = direction;
                    
                switch(direction)
                {
                    case "north":
                        theGrid.grid[theGrid.active.row-1][theGrid.active.col].directionTaken = direction;
                        path.push(theGrid.grid[theGrid.active.row-1][theGrid.active.col]);
                        break;

                    case "east":
                        theGrid.grid[theGrid.active.row][theGrid.active.col+1].directionTaken = direction;
                        path.push(theGrid.grid[theGrid.active.row][theGrid.active.col+1]);
                        break;

                    case "south":
                        theGrid.grid[theGrid.active.row+1][theGrid.active.col].directionTaken = direction;
                        path.push(theGrid.grid[theGrid.active.row+1][theGrid.active.col]);
                        break;

                    case "west":
                        theGrid.grid[theGrid.active.row][theGrid.active.col-1].directionTaken = direction;
                        path.push(theGrid.grid[theGrid.active.row][theGrid.active.col-1])
                        break;

                    default:
                        return;
                        break;
                }

                console.log(path);

                slideOn(path, false);
                
                return;
            });

            $(".lattice-grid-link").click(function(e){
                e.preventDefault();

                var hrefValue = $(this).attr('href');
                hrefValue = hrefValue.replace("#", "");
                var coords = hrefValue.split("-");

                var path =  solveGrid({
                                row: theGrid.active.row,
                                col: theGrid.active.col
                            }, theGrid.grid[coords[0]][coords[1]], theGrid.grid);
                slideOn(path, true);                
                return;
            });


            function updateActiveThumbnail(row, col){
                $(".lattice-thumbnail-map .lattice-thumbnail-active").toggleClass("lattice-thumbnail-active");
                var selector = ".lattice-thumbnail-map .lattice-grid-link[href=#" + row + "-" + col + "] .lattice-thumbnail";
                $(selector).toggleClass("lattice-thumbnail-active");
            }

            function updateActivePanel(row, col){
                theGrid.active.row =  row;
                theGrid.active.col = col;
            }

            function slideOn(path, usePause){
                if (path.length > 1 || !path ){
                    var index = 0,
                        pause = usePause ? options.pause : 0;
                    window.setInterval(function(){
                        if( (index+1) == path.length) return;

                        console.log("Taking slide " +  index + " in the " + path[index].directionTaken + " direction.")
                        updateActiveThumbnail( path[index+1].row, path[index+1].col);

                        if( index > 0 ){
                            slideTo( path[index], path[index+1], path[index-1]);
                        } else {
                            slideTo( path[index], path[index+1], false );
                        }
                        
                        index++;

                    }, pause);
                }
            }

            function slideTo(fromNode, toNode, prevNode){

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
                    console.log(direction);

                $.each(animOptions, function(index, value){
                    animOptions[index][direction] = 0;
                });

                if(fromNode.directionTaken == 'west' || fromNode.directionTaken == 'east') {
                    animOptions[0][direction] = $current.width();
                    animOptions[1][direction] = -($current.width());
                } else {
                    animOptions[0][direction] = $current.height();
                    animOptions[1][direction] = -($current.height()); 
                }

                $current.removeClass('active').animate(animOptions[0], options.speed);
                $target.addClass('active').show().css(animOptions[1]).animate(animOptions[2], options.speed);

                theGrid.active.col = toNode.col;
                theGrid.active.row = toNode.row;
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
                console.log("Starting solver.");
                var path = [];
                console.log("Path initialized");
                if ( solveGridHelper( start, end, grid, path) != null ) {
                    resetGridVisits();
                    console.log("Found a solution. Returning path.")
                    path.reverse();
                    return path;
                }

                resetGridVisits();
                console.log("Solution not found! Returning null.")
                return null;
            }

            function solveGridHelper(start, end, grid,  path){

                console.log("Currently at " + start.row + ":" + start.col);

                //Check if we're already at the goal
                if(coordsAreEqual(start, end)){
                    console.log("We've reached the end!");
                    grid[start.row][start.col].visited =  true;
                    var pathNode =  grid[start.row][start.col];
                    pathNode.directionTaken = 'none';
                    path.push(pathNode);
                    return path;
                }

                var compass = {
                    north: (start.row-1) < 0 ? {row:null,col:null} : grid[start.row-1][start.col],
                    south: (start.row+1) >= grid.length ? {row:null,col:null}  : grid[start.row+1][start.col],
                    east:  (start.col+1) >= grid[0].length ? {row:null,col:null}  : grid[start.row][start.col+1],
                    west:  (start.col-1) < 0 ? {row:null,col:null}  : grid[start.row][start.col-1],
                };

                console.log(compass);

                for (var direction in compass) {
                    if (compass.hasOwnProperty(direction)) {
                        console.log(compass[direction]);
                        console.log("Checking " + compass[direction].row + ":" + compass[direction].col + " to the " + direction );
                        if(grid[start.row][start.col][direction] && compass[direction] && !compass[direction].visited) {
                            console.log("Room is open. Going " + direction + ".");
                            grid[start.row][start.col].visited = true;
                            if( solveGridHelper(compass[direction], end, grid, path ) != null ){
                                var pathNode =  grid[start.row][start.col];
                                pathNode.directionTaken = direction;
                                path.push(pathNode);
                                return path;
                            }
                        }
                        console.log("Closed.");
                    }
                }

                console.log("Reached a dead end.");
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
                for(var rows = 0; rows <= theGrid.gridRows; rows++){
                    for(var cols = 0; cols <= theGrid.gridCols; cols++){
                        theGrid.grid[rows][cols].visited = false;
                    }
                }
            }

            

        }); // end each     
        
        return this;

    } // End plugin. Go eat cake.

})(jQuery);



