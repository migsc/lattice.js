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
                $(selector).toggleClass(latt.thumbnailActiveClass);
            }

            var getNatural = function($mainImage) {
                var mainImage = $mainImage[0],
                    d = {};

                if (mainImage.naturalWidth === undefined) {
                    var i = new Image();
                    i.src = mainImage.src;
                    d.oWidth = i.width;
                    d.oHeight = i.height;
                } else {
                    d.oWidth = mainImage.naturalWidth;
                    d.oHeight = mainImage.naturalHeight;
                }
                return d;
            }

            var updateActivePanel = function(row, col){
                latt.active.row =  row;
                latt.active.col = col;
            }

            var hideAdjacentLinks = function(){
                $('.lattice-adjacent-link').hide(latt.adjacentLinkHideDuration);
            }

            var showAdjacentLinks = function(){
                return;
                $('.lattice-adjacent-link').show(latt.adjacentLinkShowDuration);
            }

            var hideThumbnailMap = function(){
                if(latt.fullWindow) return;
                $('#lattice-thumbnail-map').hide(latt.thumbnailMapHideDuration);
            }

            var showThumbnailMap = function (){
                $('#lattice-thumbnail-map').show(latt.thumbnailMapShowDuration)
                                           .css('display','inline');
            }

            var mergeObjects = function(list){
                var merged = {};
                for(var i=0; i<list.length; i++){
                    for(var prop in list[i]){
                        if(list[i].hasOwnProperty(prop)){
                            merged[prop] = list[i][prop];
                        }
                    }
                }
                return merged;
            }

            var cropPositionToStyle = function(position, dimensionLength){
                if(latt.cropDict.hasOwnProperty(position)){
                    if(typeof latt.cropDict[position] === 'function'){
                        return latt.cropDict[position](dimensionLength);
                    } else {
                        return latt.cropDict[position];
                    }
                } else {
                    return {};
                }
            }

            var getCropStyles = function(cropOption, $reference){
                var optionPair = cropOption.split('-'),
                    width = $reference.width(),
                    height = $reference.height();
                
                if( $reference.is('img') && ( width === 0 || height === 0 ) ) {
                    var dimensions = getNatural($reference);
                    width = dimensions.oWidth;
                    height = dimensions.oHeight;
                }

                console.log(width + ' ' + height);

                if(optionPair.length !== 2){
                    return {};
                }
                return mergeObjects([
                    cropPositionToStyle(optionPair[0], height), 
                    cropPositionToStyle(optionPair[1], width)
                ]);
            }

            var slideOn = function (path, usePause){

                if (path.length > 1 || !path ) {

                    var index = 0,
                        pause = latt.speed;
                    var isAdjacentToDestination = ( index == path.length - 2 );

                    updateActiveThumbnail( path[index+1].row, 
                                path[index+1].col);
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
                        translation.val = -((row - 1) * $('#lattice-wrap').height()) + 'px';
                    } else {
                        translation.val = -((row + 1) * $('#lattice-wrap').height()) + 'px';
                    }
                } else {
                    translation.prop = 'margin-left';
                    if( direction === 'west'){
                        translation.val = -((col - 1) * 100) + '%';
                    } else {
                        translation.val = -((col + 1) * 100) + '%';
                    }
                }

                return translation;
            }
            
            //TODO: Refactor this
            var slideTo = function (fromNode, toNode, prevNode, isAdjacentToDestination){

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

                $('.lattice-container').animate(
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

            var parseStyle = function(value){
                if(typeof value !== 'string'){
                    return false;
                }
                
                if(value.indexOf('px') > -1){
                    return {
                        number: parseInt(value.replace('px', '')), 
                        type: 'px',
                    };
                }

                if(value.indexOf('%') > -1){
                    return {
                        number: parseInt(value.replace('%', '')), 
                        type: '%',
                    };
                }

                return {
                    number: 0, 
                    type: '',
                };
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

            var activateFullWindow =function(){
                alert('asdf');
                $("#lattice-wrap").css({
                    'position':'absolute',
                    'width': window.innerWidth + 'px',
                    'height': $(window).height() + 'px',
                    'z-index' : '9999',
                    'left' : '0',
                    'right' : '0'
                });
            }

            var addThumbnailToMap = function(customCss, thumbnail, clearValue, row, col){
                
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
            crop: 'center',
            scale: 'none',
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
            selfThumbedCells: [],
            gutter: '1%',
            html2Canvas: false,
            thumbnailActiveClass: 'lattice-thumbnail-active',
            containerClass: 'lattice-container',
            html : {
                wrapper:            '<div id="lattice-wrap" ' + 
                                    'style="position:relative;' + 
                                    'overflow:hidden;"></div>',
                thumbnailDefault:   '<div class="lattice-thumbnail"></div>',
                thumbnailEmpty:     '<div class="lattice-thumbnail-empty">' + 
                                    '</div>',
                thumbnailMap:       '<div id="lattice-thumbnail-map" ' + 
                                    'style="position:absolute;' + 
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
            styles : {
            },
            sliderWidth: null,
            sliderHeight: null,
            innerWidth: null,
            innerHeight: null,
            fullWindow: false,
            //Runtime data
            grid: [],
            gridImage: null,
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
            cropDict: {
                middle : function(h){ 
                    return {
                        'top' : '50%',
                        'margin-top' : (h/-2) + 'px'
                    };
                },
                center : function(w){
                    return {
                        'left' : '50%',
                        'margin-left' : (w/-2) + 'px'
                    };
                },
                top : {
                    'top' : '0'
                },
                bottom : {
                    'bottom' : '0'
                },
                left : {
                    'left' : '0'
                },
                right : {
                    'right' : '0'
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
        
        //Add some global stylings to the document
        $('body').append(function(){
            var block = '<style type="text/css">';
            for(var section in latt.styles){
                if(latt.styles.hasOwnProperty(section)){
                    block += latt.styles[section];
                }
            }
            block += '</style>';
            return block;
        });
        
        
        // for each item in the wrapped set
        return this.each(function() {

            // Cache 'this'    
            var $this = $(this);

            // Cache the grid size
            latt.gridRows = getMaxData($this, 'row');
            latt.gridCols = getMaxData($this, 'col');

            latt.containerContext = $this.context;

            $this.children().css({
                'list-style' : 'none',
                'position': 'absolute',
                'display': 'block',
            });


            /*
             * Wrap 'this' in a div with a class and set some styles. Adjusting 
             * the 'left' css values, so need to set positioning.
             */
            $this.css({
                'position' : 'relative',
                'width' : (latt.gridCols + 1) * 100 + '%',
                'height' : (latt.gridRows + 1) * 100 + '%'
            }).addClass(latt.containerClass).wrap(latt.html.wrapper);

            $('#lattice-wrap').css({
                'width': latt.sliderWidth + 'px',
                'height': latt.sliderHeight + 'px'
            });

            if(latt.thumbnailMapEnabled){
                //Add the thumbnail map
                lattlog($('#lattice-wrap').length);
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
                lattlog($('#lattice-wrap #lattice-thumbnail-map'));
            }
            

            /*
             * Build the grid array while creating thumbnails and setting 
             * available paths along the way
             */
            for(var rows = 0; rows <= latt.gridRows; rows++){
                
                latt.grid[rows] = [];

                for(var cols = 0; cols <= latt.gridCols; cols++){

                    // Cache the reference to the cell's element
                    var $reference = $this.find('[data-row=' + rows + '][data-col=' + 
                                cols + ']'),
                        clearValue = ( cols == latt.gridCols ) ? 
                                'right' : 'none',
                        selfThumbed = false;

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
                        var thumbData = $reference.data('thumb');
                        if(thumbData === 'self' && $reference.is('img') ){

                            //The element itself is an image and will be thumbed
                            var thumb = $('<img class="lattice-thumbnail">');
                            thumb.attr('src', $reference.attr('src'));

                            addThumbnailToMap({}, thumb, clearValue, rows, cols); 

                        } else if(thumbData === 'self' && latt.html2Canvas) {

                            //NOT an image so it will be thumbed into a canvas
                            addThumbnailToMap({
                                'background-repeat' : 'no-repeat',
                                'background-size' : 
                                    ((latt.gridCols+1) * latt.thumbnailWidth ) +
                                     'px ' + 
                                    ((latt.gridRows+1) * latt.thumbnailHeight) + 
                                    'px',
                                'background-position' : 
                                    ( - cols * latt.thumbnailWidth )+ 'px ' + 
                                    ( - rows * latt.thumbnailHeight) + 'px',
                                'background-color': '#A7A1A1'
                            }, latt.html.thumbnailDefault, clearValue, rows, 
                                    cols);
                            selfThumbed= true;

                        } else if (thumbData && thumbData !== 'self') {
                            
                            //Some selector for an image in the thumb-data attr   
                            //TODO: Make this happen
                            addThumbnailToMap({}, 
                                $('<div>').append(
                                    $(thumbData).addClass('lattice-thumbnail')
                                                .clone()
                                        ).html(), 
                                clearValue, rows, cols);                            
                        } else {

                            //No thumb-data attr so use the default thumb
                            addThumbnailToMap({
                                'background-color': '#A7A1A1'
                            }, latt.html.thumbnailDefault, clearValue, rows, 
                                cols);
                        }

                        //Set cropping for the element, which is really just 
                        //positioning of the element within its parent with
                        //a hidden overflow.
                        var cropData = $reference.data('crop');
                        if(!cropData){
                            cropData = latt.crop;
                        }

                        $(window).resize( function(){
                            var $inner = $reference.parent('.lattice-cell-inner');
                            console.log($inner);
                            if($inner.width() >= $reference.width() &&
                                $inner.height() >= $reference.height()){
                                $reference.css(getCropStyles('middle-center', $reference));
                            } else {
                                $reference.css(getCropStyles(cropData, $reference));
                                
                            }
                            
                        }).trigger('resize');

                        //$reference.css(getCropStyles(cropData, $reference));

                        setCellProperties(rows, cols, {
                            element: $reference,
                            cellName: rows + 'x' + cols,
                            html: $('<div>').append($reference.clone()).html(),
                            row: parseInt($reference.data('row')),
                            col: parseInt($reference.data('col')),
                            travel: $reference.data('travel'),
                            visited: false,
                            north: false,
                            south: false,
                            east: false,
                            west: false,
                            adjacents: {},
                            crop: cropData,
                        });

                        if(selfThumbed){
                            latt.selfThumbedCells.push(latt.grid[rows][cols]);
                        }

                        //TODO: Scale options
                        //
                        //scale/data-scale : 'none|height'|'width'|'width-height'
                        //
                        //
                        //Assume width OR height of element is bigger than its parent .lattice-cell-inner
                        //
                        //Case 1: width >= height.
                        //Scale proportionally until width meets parent width
                        //
                        //Case 1.1: it fits!
                        //Case 1.2: new height > parent height
                        //Scale proportionally until new height meets parent height.
                        // 
                        //Case 2: height > width.
                        //Scale proportionally until height meets parent height
                        //If new width > parent width
                        //Scale proportionally until new width meets parent width.
                        
                        var cellStyling = 
                                'width:' + (1/(latt.gridCols+1))*100 + '%;' +
                                'height:' + (1/(latt.gridRows+1))*100 + '%;' +
                                'position:absolute;' + 
                                'left:' + (cols/(latt.gridCols+1))*100 + '%;' +
                                'top:' + (rows/(latt.gridRows+1))*100 + '%;',
                            innerCellStyling = 
                                'position:relative;' + 
                                'overflow:hidden;' + 
                                'height:100%;' + 
                                'width:100%;' +
                                'margin:0';

                        $reference.wrap(
                            '<div id="cell' + rows + '-' + cols +
                                '" class="lattice-cell" style="' + cellStyling
                                + '">' + 
                                    '<div class="lattice-cell-inner"' + 
                                    ' style="'+ innerCellStyling + '">' + 
                                    '</div>' + 
                             '</div>'
                        );

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

            //Now set the gutters for each cell. 
            latt.gutter = parseStyle(latt.gutter);
            if(latt.gutter.type === 'px'){

                var hGutter = (latt.gutter.number/latt.sliderWidth) * 100,
                    vGutter = (latt.gutter.number/latt.sliderHeight) *  100;
                
                $('.lattice-cell-inner').css({
                    'margin' : '0 auto',
                    'width' : 100 - 2(hGutter) + '%',
                    'height' : 100 - 2(vGutter) + '%',
                    'top' : vGutter + '% '
                });
            } else if(latt.gutter.type === '%'){
                $('.lattice-cell-inner').css({
                    'margin' : '0 auto',
                    'width' : 100 - (2 * latt.gutter.number) + '%',
                    'height' : 100 - (2 * latt.gutter.number) + '%',
                    'top' : latt.gutter.number + '% '
                });
            }


            if(latt.fullWindow) {
                activateFullWindow();
            }

            //Set the active slide
            var $active = $this.find(latt.startSelector);
            $active.toggleClass('active');

            latt.active.row = parseInt($active.data('row'));
            latt.active.col = parseInt($active.data('col'));

            if($('[data-thumb=self]').length > 0 && latt.html2Canvas){
                html2canvas($("#container"), {
                        useOverflow: true,
                        onpreloaded: function(){
                            $("#lattice-wrap").css('overflow','visible');
                            $this.css({
                                'margin-top' : '0px',
                                'margin-left' : '0px',
                            });
                        },
                        onrendered: function(canvas, rows, cols) {
                            var style = $('<style>.lattice-thumbnail-self {' +
                                            ' background-image: url(' + 
                                            canvas.toDataURL('image/png') + 
                                            '); }</style>');
                            $('html > head').append(style);

                            $("#lattice-wrap").css('overflow','hidden');
                            latt.gridImage = canvas.toDataURL('image/png');
                                                        
                            $this.css({
                                'margin-top' : - ( latt.active.row * 
                                    latt.sliderHeight ) + 'px',
                                'margin-left' : - ( latt.active.col * 
                                    latt.sliderWidth ) + 'px',
                            });
                            for(var i=0; i<latt.selfThumbedCells.length;i++){
                                var cell = latt.selfThumbedCells[i];
                                var selector = '#L' + 
                                                cell.row + '-' + cell.col + 
                                                ' .lattice-thumbnail';
                                $(selector).addClass('lattice-thumbnail-self');
                            }
                        }
                });
            }

            //Move the container to the chosen slide to be the first active.
            $this.css({
                'margin-top' : ((latt.active.row)*-100) + '%',
                'margin-left' : ((latt.active.col)*-100) + '%',
            });

            updateActiveThumbnail(latt.active.row, latt.active.col);

            hideThumbnailMap();
            hideAdjacentLinks();

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

            

            /******************************
            * EVENTS
            */

            $(window).resize(function(){
                if(latt.fullWindow){
                    activateFullWindow();
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
                hideThumbnailMap();
            });

            $('#lattice-wrap').resize(function(){

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
                if(latt.inMotion ){
                    return;
                } else {
                    latt.inMotion = true;
                } 

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