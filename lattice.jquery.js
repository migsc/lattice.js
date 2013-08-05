/*!
 * Lattice v0.5
 * A jQuery plugin to assemble organize HTML elements in a grid fashion and do 
 * other neat things.
 * Original author: @chateloinus
 * Licensed under the MIT license
 */

;(function($, window, document, undefined) {

    $.fn.lattice = function(config) {

            'use strict';

            var updateActiveThumbnail = function(row, col){
                $('#lattice-thumbnail-map .' + 
                        latt.thumbnailActiveClass).toggleClass( 
                            latt.thumbnailActiveClass );
                var selector = '#lattice-thumbnail-map ' + 
                        '.lattice-grid-link#L' + row + '-' + col +
                         ' .lattice-thumbnail';
                lattlog('GOOBERS:');
                lattlog($(selector));
                $(selector).toggleClass(latt.thumbnailActiveClass);
            }

            var updateActivePanel = function(row, col){
                latt.active.row =  row;
                latt.active.col = col;
            }

            var hideAdjacentLinks = function(){
                $('.lattice-adjacent-link').hide(latt.adjacentLinkHideDuration);
            }

            var showAdjacentLinks = function(){
                $('.lattice-adjacent-link').show(latt.adjacentLinkShowDuration);
            }

            var hideThumbnailMap = function(){
                if(latt.fullScreen) return;
                $('#lattice-thumbnail-map').hide(latt.thumbnailMapHideDuration);
            }

            var showThumbnailMap = function (){
                $('#lattice-thumbnail-map').show(latt.thumbnailMapShowDuration)
                                           .css('display','inline');
            }

            var slideOn = function (path, usePause){

                if (path.length > 1 || !path ) {

                    var index = 0,
                        pause = latt.speed;
                    var isAdjacentToDestination = ( index == path.length - 2 );

                    slideTo( path[index], path[index+1], false, 
                            isAdjacentToDestination);
                    index++;

                    window.setInterval(function(){
                        if( (index+1) == path.length){
                            return;
                        }

                        if( index == 0) {
                            pause = 0;
                        }

                        lattlog('Taking slide ' + index + ' in the ' + 
                                path[index].directionTaken + ' direction.')

                        updateActiveThumbnail( path[index+1].row, 
                                path[index+1].col);

                        var prevNode = index > 0 ? path[index-1] : false,
                            isAdjacentToDestination = ( index == path.length - 
                                    2 );
                               
                        slideTo( path[index], path[index+1], prevNode, 
                                isAdjacentToDestination);

                        index++;

                    }, pause);
                    
                }

                
                latt.inMotion = false;
            }

            var translateDirectionToCss = function(direction, row, col){
                var translation = {};

                if(direction === 'north' || direction === 'south') {
                    translation.prop = 'margin-top';
                    if( direction === 'north'){
                        translation.val = -(row - 1) * latt.sliderHeight;
                    } else {
                        translation.val = -(row + 1) * latt.sliderHeight;
                    }
                } else {
                    translation.prop = 'margin-left';
                    if( direction === 'west'){
                        translation.val = -(col - 1) * latt.sliderWidth;
                    } else {
                        translation.val = -(col + 1) * latt.sliderWidth;
                    }
                }

                return translation;
            }
            
            //TODO: Refactor this
            var slideTo = function (fromNode, toNode, prevNode, 
                    isAdjacentToDestination){

                var $current = fromNode.element,
                    $target = toNode.element,
                    easing = isAdjacentToDestination ?
                        latt.adjacentEasing : latt.nonAdjacentEasing,
                    animAfter = function(){
                                    if(isAdjacentToDestination){
                                        showAdjacentLinks();
                                    }
                                },
                    animCss = translateDirectionToCss(fromNode.directionTaken, 
                        fromNode.row, fromNode.col);

                hideAdjacentLinks();
               
                var animOptions = {};
                animOptions[animCss.prop] = animCss.val;

                $current.parent('#container').animate(
                    animOptions, latt.speed, easing, function(){
                                                    if(isAdjacentToDestination){
                                                        showAdjacentLinks();
                                                    }
                                                });

                latt.active.col = toNode.col;
                latt.active.row = toNode.row;

                lattlog('Update on latt:');
                lattlog(latt);
            }

            var createGrid = function(length) {
                var arr = new Array(length || 0),
                    i = length;

                if (arguments.length > 1) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    while(i--) arr[length-1 - i] = 
                            createArray.apply(this, args);
                }

                return arr;
            }

            var getMaxData = function($parent, name){
                return  $parent.children().map(function(){
                            return parseInt($(this).data(name));
                        }).get().sort(function(a, b) {
                            return b - a;
                        })[0];
            }

            var solveGrid = function(start, end, grid){
                
                lattlog('Starting solver.');
                
                var cacheIndex =  start.cellName + '_' + end.cellName;
                lattlog('BIG DICKS: ' + start.cellName + '_' + end.cellName);
                lattlog(start.cellName);

                lattlog('Checking cache.');
                if( latt.usePathCaching && 
                    latt.pathCache.hasOwnProperty( cacheIndex ) ){

                    lattlog('Using a cached path.')
                    lattlog(latt.pathCache[cacheIndex]);
                    return latt.pathCache[cacheIndex];
                }

                lattlog('Path initialized');
                var path = [];

                if ( depthFirstSearch( start, end, grid, path) != null ) {
                    lattlog('Found a solution. Returning path. Caching path. ' + 
                            'Resetting grid visits.');
                    resetGridVisits();
                    path.reverse();
                    latt.pathCache[cacheIndex] = path;
                    return path;
                    lattlog(latt);
                }

                resetGridVisits();
                lattlog(latt);
                lattlog('Solution not found! Returning null.')
                return null;
            }

            var breadthFirstSearch = function(start, end, grid, path){
                return null;
            }

            var depthFirstSearch = function(start, end, grid, path){

                lattlog('Currently at ' + start.row + ':' + start.col);

                //Check if we're already at the goal
                if(coordsAreEqual(start, end)){
                    lattlog('We\'ve reached the end!');
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


                var compass = latt.grid[start.row][start.col].adjacents;
                
                for(var direction in generallyTo){
                    if(generallyTo[direction] && compass[direction]){

                        lattlog('GENERAL BIAS: Checking ' + 
                                compass[direction].row + ':' + 
                                compass[direction].col + ' to the ' + 
                                direction );

                        if(grid[start.row][start.col][direction] && 
                                compass[direction] && 
                                !compass[direction].visited) {

                            lattlog('Room is open. Going ' + direction + '.');
                            grid[start.row][start.col].visited = true;
                            if( depthFirstSearch(compass[direction], end, 
                                    grid, path ) != null ){
                                var pathNode =  grid[start.row][start.col];
                                pathNode.directionTaken = direction;
                                path.push(pathNode);
                                return path;
                            }
                        }

                        lattlog('Closed.');
                    }
                }

                lattlog(compass);

                for (var direction in compass) {

                    if (compass.hasOwnProperty(direction) && 
                            compass[direction]) {

                        lattlog(compass[direction]);
                        lattlog('Checking ' + compass[direction].row + ':' + 
                            compass[direction].col + ' to the ' + direction );

                        if(grid[start.row][start.col][direction] && 
                            compass[direction] && !compass[direction].visited) {

                            lattlog('Room is open. Going ' + direction + '.');
                            grid[start.row][start.col].visited = true;
                            if( depthFirstSearch(compass[direction], end, 
                                    grid, path ) != null ){

                                var pathNode =  grid[start.row][start.col];
                                pathNode.directionTaken = direction;
                                path.push(pathNode);
                                return path;
                            }

                        }

                        lattlog('Closed.');
                    }
                }

                lattlog('Reached a dead end.');
                //If we get here, it's a dead end!
                return null;
            }

            var coordsAreEqual = function(coordOne, coordTwo){
                if(coordOne.row == coordTwo.row && 
                        coordOne.col == coordTwo.col){

                    return true;
                }
                return false;
            }

            var compassToCss = function(direction) {
                var compass = {
                    north: 'top',
                    south: 'bottom',
                    east: 'right',
                    west: 'left'
                };
                return compass[direction];
            }

            var cloneObject = function(o) {
                return $.extend({}, o);
            }

            var resetGridVisits = function() {
                for(var rows = 0; rows <= latt.gridRows; rows++){
                    for(var cols = 0; cols <= latt.gridCols; cols++){
                        latt.grid[rows][cols].visited = false;
                    }
                }
            }

            var activateFullScreen =function(context){
                $(context).css({
                    'width': '100%',
                    'height': '100%'
                });
                $('.' + latt.containerClass).css({
                    'width': window.innerWidth + 'px',
                    'height': $(window).height() + 'px'
                });
            }

            //TODO: Figure out how to make this work
            var createDynamicThumbnail = function($reference, rows, cols, thumbnail){
                var idSelector = '#' + $reference.attr('id');
                    html2canvas($(idSelector), {
                        onrendered: function(canvas, rows, cols) {
                            var image = new Image();
                            image.src = canvas.toDataURL('image/png');
                            image.style = 'width:100%;height:100%;';

                            $(thumbnail).append(image)
                                        .appendTo('#lattice-thumbnail-map')
                                        .css({
                                            'clear': clearValue,
                                            'display': 'block',
                                            'float': 'left',
                                            'width': latt.thumbnailWidth + 
                                                     'px',
                                            'height': latt.thumbnailHeight + 
                                                      'px',
                                            'margin': latt.thumbnailSpacing + 
                                                      'px'
                                        })

                            wrapThumbnailInAnchor(thumbnail ,$reference);
                        }
                    });
            }

            var addThumbnailToMap = function(customCss, thumbnail, clearValue, row, 
                    col){
                
                if(row === null  || col === null) return;

                var idValue = 'id="L' + row + '-' + col + '" ';

                $(thumbnail).appendTo('#lattice-thumbnail-map').css({
                    'clear': clearValue,
                    'display':'block',
                    'float': 'left',
                    'width': latt.thumbnailWidth + 'px',
                    'height': latt.thumbnailHeight + 'px',
                    'margin': latt.thumbnailSpacing + 'px'
                }).css(customCss).wrap(function(){
                    return '<a class="lattice-grid-link" href="#" ' + idValue + 
                           '" ></a>';
                });
            }

            var setCellProperties = function(row, col, props){
                
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

            var addAdjacentLink = function($reference, direction) {
                $reference.append(
                    '<a class="lattice-adjacent-link" href="#' + direction + 
                    '">' + latt.html[direction + 'Arrow'] + '</a>'
                );
            }

            var lattlog = function(mixed){
                if( latt.debug && window.console && window.console.log) {
                    console.log(mixed);
                }
            }


        /* 
         * Take the options that the user selects, and merge them with defaults 
         * along with defaults for runtime data.
         */
        var latt = $.extend({}, {
            //User selected
            startSelector: '>:first-child',
            debug: false,
            speed : 1000,
            pause : 3000,
            adjacentEasing: 'swing',
            nonAdjacentEasing: 'linear',
            thumbnailMapEnabled : true,
            thumbnailWidth : 15,
            thumbnailHeight: 15,
            thumbnailSpacing: 3,
            adjacentLinkHideDuration: 200, 
            adjacentLinkShowDuration: 700,
            thumbnailMapHideDuration: 200,
            thumbnailMapShowDuration: 700,
            usePathCaching: false,
            thumbnailActiveClass: 'lattice-thumbnail-active',
            containerClass: 'lattice-container',
            html : {
                wrapper:            '<div id="lattice-wrap" ' + 
                                    'style="position:relative;' + 
                                    'overflow:hidden;"></div>',
                thumbnailDefault:   '<div class="lattice-thumbnail"></div>',
                thumbnailEmpty:     '<div class"lattice-thumbnail empty">' + 
                                    '</div>',
                thumbnailMap:       '<div id="lattice-thumbnail-map" ' + 
                                    'style="opacity:0.4;position:absolute;' + 
                                    'bottom:15px;right:15px"></div>',
                northArrow:         '<div style="left:50%;top:15px;' + 
                                    'position:absolute;opacity:0.4;width:0;' + 
                                    'height:0;' + 
                                    'border-left:20px solid transparent;' + 
                                    'border-right:20px solid transparent;' + 
                                    'border-bottom:' + 
                                    '20px solid rgb(167,161,161);"></div>',
                eastArrow:          '<div style="top:50%;right:15px;' + 
                                    'position:absolute;opacity:0.4;width:0;' + 
                                    'height: 0;' + 
                                    'border-top:20px solid transparent;' + 
                                    'border-bottom: 20px solid transparent;' + 
                                    'border-left: ' + 
                                    '20px solid rgb(167, 161, 161);"></div>',
                southArrow:         '<div style="left:50%;bottom:15px;' + 
                                    'position:absolute;opacity:0.4;width:0;' + 
                                    'height:0;border-left:' + 
                                    '20px solid transparent;' + 
                                    'border-right:20px solid transparent;' + 
                                    'border-top:' + 
                                    '20px solid rgb(167, 161, 161);"></div>',
                westArrow:          '<div style="top:50%;left:15px;' + 
                                    'position:absolute;opacity:0.4;width:0;' + 
                                    'height:0;border-top:' + 
                                    '20px solid transparent;border-bottom:' + 
                                    '20px solid transparent; border-right:' + 
                                    '20px solid rgb(167, 161, 161); "></div>',
            },
            sliderWidth: 500,
            sliderHeight: 400,
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
            },
            pathCache: {}
        }, config);

        /**
         * If the pause is less than speed, it'll cause a flicker. This will 
         * check for that, and if it is smaller, it increases it to just about 
         * the speed.
         */
        if(latt.pause <= latt.speed) latt.pause = latt.speed + 100;
        
        // for each item in the wrapped set
        return this.each(function() {

            // Cache 'this'    
            var $this = $(this);

            // Cache the grid size
            latt.gridRows = getMaxData($this, 'row');
            latt.gridCols = getMaxData($this, 'col');

            latt.containerContext = $this.context;

            /*
             * Wrap 'this' in a div with a class and set some styles. Adjusting 
             * the 'left' css values, so need to set positioning.
             */
            $this.css({
                'position' : 'relative',
                'width' : (latt.gridCols + 1) * latt.sliderWidth + 'px',
                'height' : (latt.gridRows + 1) * latt.sliderHeight + 'px'
            }).addClass(latt.containerClass).wrap(latt.html.wrapper);

            $('#lattice-wrap').css({
                'width': latt.sliderWidth + 'px',
                'height': latt.sliderHeight + 'px'
            });

            $this.children().css({
                'list-style' : 'none',
                'position': 'absolute',
                'width' : latt.sliderWidth + 'px',
                'height' : latt.sliderHeight + 'px',
                'display': 'block'
            });

            if(latt.fullScreen) {
                activateFullScreen(this);
            }

            
            if(latt.thumbnailMapEnabled){
                //Add the thumbnail map
                $(latt.html.thumbnailMap).appendTo('#lattice-wrap')
                    .width(function(){
                        return ( latt.thumbnailWidth + 
                                ( 2 * latt.thumbnailSpacing ) ) * 
                                (latt.gridCols + 1);
                    }).height(function(){
                        return ( latt.thumbnailHeight + 
                                ( 2 * latt.thumbnailSpacing ) ) 
                                * (latt.gridRows + 1);
                    });
            }

            /*
             * Build the grid array while creating thumbnails and setting 
             * available paths along the way
             */
            for(var rows = 0; rows <= latt.gridRows; rows++){
                latt.grid[rows] = [];
                for(var cols = 0; cols <= latt.gridCols; cols++){

                    // Cache the reference to the cell's element
                    var $reference = $('[data-row=' + rows + '][data-col=' + 
                                cols + ']'),
                        clearValue = ( cols == latt.gridCols ) ? 
                                'right' : 'none';

                    
                    if($reference.length === 0){

                        /**
                         * If an element doesn't exist for this cell, we'll 
                         * use the default empty placeholder
                         */
                        setCellProperties(rows, cols, false);
                        addThumbnailToMap({
                                'background':'none'
                            }, latt.html.thumbnailEmpty, clearValue, rows, 
                                    cols);
                    } else {

                        /**
                         * This element does exist. We'll create the thumbnail, 
                         * set the cell properties in our global, and add some 
                         * positioning for the actual element.
                         */
                        addThumbnailToMap({
                                'background-color': '#A7A1A1'
                            }, latt.html.thumbnailDefault, clearValue, rows, 
                                cols);

                        var cellRow = parseInt($reference.data('row')),
                            cellCol = parseInt($reference.data('col'));

                        setCellProperties(rows, cols, {
                            element: $reference,
                            cellName: cellRow + 'x' + cellCol,
                            html: $('<div>').append($reference.clone()).html(),
                            row: parseInt($reference.data('row')),
                            col: parseInt($reference.data('col')),
                            travel: $reference.data('travel'),
                            visited: false,
                            north: false,
                            south: false,
                            east: false,
                            west: false,
                            adjacents: {}
                        });

                        $reference.css({
                            'left' : (cols * latt.sliderWidth) + 'px',
                            'top' : (rows * latt.sliderHeight) + 'px'
                        });
                    }          

                    
                    if (latt.grid[rows][cols] && latt.grid[rows][cols].travel){

                        /**
                         * Define available paths for that cell based on the 
                         * travel data attribute
                         */
                        $.each(latt.grid[rows][cols].travel.split(','), 
                                function(index, value){
                                    latt.grid[rows][cols][value] = true;
                                    addAdjacentLink($reference, value);
                                }
                        );

                    } else { 

                        //No path data attribute? Go by adjacency
                        for( var direction in latt.compassDict ){
                            if (latt.compassDict.hasOwnProperty(direction)){
                                //TODO: Find a faster way of doing this
                                var adjacentCellSelector = 
                                    '[data-row=' + (rows + 
                                    latt.compassDict[direction].offsetR) + 
                                    '][data-col=' + (cols + 
                                    latt.compassDict[direction].offsetC) + 
                                    ']',
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

                    }

                } //end col loop
            }//end row loop

            //Some more setup for the grid, now that all the cells are defined
            for(var rows = 0; rows <= latt.gridRows; rows++){
                for(var cols = 0; cols <= latt.gridCols; cols++){

                    latt.grid[rows][cols].adjacents = {
                        north: (rows-1) < 0 ? false : latt.grid[rows-1][cols],
                        south: (rows+1) >= latt.grid.length ? 
                                false  : latt.grid[rows+1][cols],
                        east:  (cols+1) >= latt.grid[0].length ? 
                                false  : latt.grid[rows][cols+1],
                        west:  (cols-1) < 0 ? 
                                false  : latt.grid[rows][cols-1],
                    };


                }
            }
            

            lattlog(latt);

            //Set the active slide
            var $active = $this.find(latt.startSelector);
            $active.toggleClass('active');

            latt.active.row = parseInt($active.data('row'));
            latt.active.col = parseInt($active.data('col'));
            $this.css({
                'margin-top' : - ( latt.active.row * latt.sliderHeight ) + 'px',
                'margin-left' : - ( latt.active.col * latt.sliderWidth ) + 'px',
            });

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

                lattlog('KEYPRESS DETECTED: ' + latt.keyDict[event.which]);

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

            $('.active').mouseenter(function(){
                showAdjacentLinks();
                showThumbnailMap();
            });

            $('.active').mouseleave(function(){
                hideAdjacentLinks();
            });

            $('#lattice-thumbnail-map').mouseenter(function(){
                showThumbnailMap();
            });

            $('#lattice-thumbnail-map').mouseleave(function(){
                //hideThumbnailMap();
            });

            

            $('.lattice-adjacent-link').click(function(e){
                e.preventDefault();
                if(latt.inMotion) return;
                else latt.inMotion = true;

                var hrefValue = $(this).attr('href'),
                    path = [latt.grid[latt.active.row][latt.active.col]];
                
                var direction = hrefValue.replace('#', '');
                
                var rOffset = latt.compassDict[direction].offsetR,
                    cOffset = latt.compassDict[direction].offsetC;

                latt.grid[latt.active.row + rOffset][latt.active.col + cOffset].directionTaken = direction;
                path[0].directionTaken = direction;
                path.push(latt.grid[latt.active.row + rOffset][latt.active.col +  cOffset]);
                    
                

                lattlog(path);

                slideOn(path, false);

                return;
            });

            $('.lattice-grid-link').click(function(e){
                e.preventDefault();
                if(latt.inMotion) return;
                else latt.inMotion = true;

                var coords = $(this)[0].id.replace('L', '').split('-');

                var path =  solveGrid(
                                latt.grid[latt.active.row][latt.active.col], 
                                latt.grid[coords[0]][coords[1]], latt.grid);
                slideOn(path, true);
                return;
            });

            


        }); // end each     
        
        return this;

    } // End plugin.

})(jQuery, window, document);