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
            defaultThumbnail : '<div class="lattice-thumbnail"></div>',
            defaultThumbnailEmpty: '<div class"lattice-thumbnail empty"></div>'
        }, config);

        //Define the directions that can be taken
        var directions = {
            north: false,
            south: false,
            east: false,
            west: false
        };

        
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
                'border': 'solid 4px #A7A1A1',
                'background': 'whitesmoke',
                'opacity': '0.7',
                'position': 'absolute',
                'bottom': '15px',
                'right': '15px',
            }).width(function(){
                return ( options.thumbnailWidth + ( 2 * options.thumbnailSpacing ) ) * (theGrid.gridCols + 1);
            }).height(function(){
                return ( options.thumbnailHeight + ( 2 * options.thumbnailSpacing ) ) * (theGrid.gridRows + 1);
            });


            //Set the active slide
            var $active = $this.find(options.startSelector);
            $active.toggleClass("active");
            theGrid.active.row = parseInt($active.data("row"));
            theGrid.active.col = parseInt($active.data("col"));
            updateActiveThumbnail(theGrid.active.row, theGrid.active.col);

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
                            return '<a class="lattice-link" href="#' 
                                + theGrid.grid[rows][cols].row
                                + '-' 
                                + theGrid.grid[rows][cols].col
                                + '"" ></a>';
                        });
                    }
                }    
            }

            console.log(theGrid.grid);

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
                            });
                        } else {
                            if( (cols+1) <= theGrid.gridCols && theGrid.grid[rows][cols+1] !== false){
                                theGrid.grid[rows][cols].east = true;
                            }
                            if( (rows+1) <= theGrid.gridRows && theGrid.grid[rows+1][cols] !== false) {
                                theGrid.grid[rows][cols].south = true;
                            }
                            if( (cols-1) >= 0 && theGrid.grid[rows][cols-1] !== false) {
                                theGrid.grid[rows][cols].west = true;
                            }
                            if( (rows-1) >= 0 && theGrid.grid[rows-1][cols] !== false) {
                                theGrid.grid[rows][cols].north = true;
                            }
                        }
                    }
                }
            }

            

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
            if(options.transition === 'slide') slide(); 

            console.log(solveGrid(theGrid.grid[0][2], theGrid.grid[0][2], theGrid.grid));

            $(".lattice-link").click(function(e){
                e.preventDefault();
                var coords = function(){ 
                        var hrefValue = $(this).attr('href');
                        hrefValue = hrefValue.replace("#", "");
                        return hrefValue.split("-");
                    };
                var path =  solveGrid({
                                row: theGrid.active.row,
                                col: theGrid.active.col
                            }, theGrid.grid[coords[0]][coords[1]], theGrid.grid);
                if (path.length == 1 || !path ){
                    //todo
                    return;
                }
                return;
            });

            function updateActiveThumbnail(row, col){
                var selector = ".lattice-thumbnail[href=#" + row + "-" + col + "]";
                $(selector).toggleClass(".lattice-thumbnail-active");
            }

            function updateActivePanel(row, col){
                theGrid.active.row =  row;
                theGrid.active.col = col;
            }

            function travelTo(target, direction) {
                var $target = target,
                    $current = $('.active'),
                    animOptions = [{}, {}, {}];

                $.each(animOptions, function(index, value){
                    animOptions[index][direction] = 0;
                });

                if(direction == 'left' || direction == 'right') {
                    animOptions[0][direction] = $current.width();
                    animOptions[1][direction] = -($current.width());
                } else {
                    animOptions[0][direction] = $current.height();
                    animOptions[1][direction] = -($current.height()); 
                }

                console.log(animOptions);

                $current.removeClass('active').animate(animOptions[0], options.speed);
                $target.addClass('active').show().css(animOptions[1]).animate(animOptions[2], options.speed);
                
                theGrid.active.col = $target.data("col");
                theGrid.active.row = $target.data("row");
            }

            function slide() {
                setInterval(function() {
                    var activeRow = parseInt($(".active").data("row")),
                        activeCol = parseInt($(".active").data("row")),
                        activeOrder = parseInt($(".active").data("order")),
                        maxOrder = $this.children().length - 1;

                    var $target = $("[data-order=" + ( activeOrder + 1 ) + "]"),
                        $prev = $("[data-order=" + ( activeOrder - 1 ) + "]");

                    if($target.length == 0) {
                        $target = $("[data-order=0]");
                    }

                    if($prev.length == 0) {
                        $prev = $("[data-order=" + maxOrder + "]");
                    }

                    $prev.removeAttr("style").css({
                        'float' : 'left',
                        'list-style' : 'none',
                        'position': 'absolute',
                        'height': '100%',
                        'width': '100%',
                        'display': 'none'
                    });

                    var direction = "left";

                    if(parseInt($target.data("row")) > activeRow) {
                        direction = "bottom";
                    } else if(parseInt($target.data("row")) < activeRow) {
                        direction = "top";
                    } else if(parseInt($target.data("col")) > activeCol) {
                        direction = "right";
                    } else if(parseInt($target.data("col")) < activeCol) {
                        direction = "left";
                    }

                    console.log(direction);                    
                    travelTo($target, direction);

                }, options.pause);
            } // end slide

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
                    console.log("Found a solution. Returning path.")
                    path.reverse();
                    return path;
                }

                console.log("Solution not found! Returning null.")
                return null;
            }

            function solveGridHelper(start, end, grid,  path){

                console.log("Currently at " + start.row + ":" + start.col);

                //Check if we're already at the goal
                if(coordsAreEqual(start, end)){
                    console.log("We've reached the end!");
                    grid[start.row][start.col].visited =  true;
                    path.push(grid[start.row][start.col]);
                    return path;
                }

                console.log("Checking East at " + start.row + ":" + (start.col + 1));

                //Check if East is open and not visited
                if(grid[start.row][start.col].east && !grid[start.row][start.col+1].visited && grid[start.row][start.col+1]) {
                    console.log("Room is open. Going East.");
                    grid[start.row][start.col].visited = true;
                    if( solveGridHelper({
                                row: start.row, 
                                col: start.col+1
                            }, end, grid, path ) != null ){

                        path.push(grid[start.row][start.col]);
                        return path;
                    
                    }
                }

                console.log("Closed.");
                console.log("Checking South at " + (start.row + 1) + ":" + start.col);

                //Check if South is open and not visited
                if(grid[start.row][start.col].south && !grid[start.row+1][start.col].visited && grid[start.row+1][start.col]) {
                    console.log("Room is open. Going South.");
                    grid[start.row][start.col].visited = true;
                    if( solveGridHelper({
                                row: start.row+1, 
                                col: start.col
                            }, end, grid, path ) != null ){

                        path.push(grid[start.row][start.col]);
                        return path;

                    }                    
                }

                console.log("Closed.");
                console.log("Checking West at " + start.row + ":" + (start.col - 1));

                //Check if West is open and not visited
                if(grid[start.row][start.col].west && !grid[start.row][start.col-1].visited && grid[start.row][start.col-1]) {
                    console.log("Room is open. Going West.");
                    grid[start.row][start.col].visited = true;
                    if( solveGridHelper({
                                row: start.row, 
                                col: start.col-1
                            }, end, grid, path ) != null ){

                        path.push(grid[start.row][start.col]);
                        return path;
                    
                    }
                }

                console.log("Closed.");
                console.log("Checking North at " + (start.row - 1) + ":" + start.col);

                //Check if North is open and not visited
                if(grid[start.row][start.col].north && !grid[start.row-1][start.col].visited && grid[start.row-1][start.col]) {
                    console.log("Room is open. Going North.");
                    grid[start.row][start.col].visited = true;
                    if( solveGridHelper({
                                row: start.row-1, 
                                col: start.col
                            }, end, grid, path ) != null ){

                        path.push(grid[start.row][start.col]);
                        return path;
                    
                    }
                }

                console.log("Closed.");
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

        }); // end each     
        
        return this;

    } // End plugin. Go eat cake.
    
})(jQuery);