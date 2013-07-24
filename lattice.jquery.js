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
                gridRows: getMaxData($this, "row"),
                gridCols: getMaxData($this, "col"),
                gridOrder: getMaxData($this, "order"),
                thumbnailMap: '<div class="lattice-thumbnail-map"></div>',
                active:{
                    row: null,
                    col: null
                },
                next: null,
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

            console.log(theGrid);

            //Set the active slide
            var $active = $this.find(options.startSelector);
            $active.toggleClass("active");
            theGrid.active.row = parseInt($active.data("row"));
            theGrid.active.col = parseInt($active.data("col"));

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
                    } else if(true) {
                        var referenceHtml = $('<div>').append($reference.clone()).html();
                        html2canvas(referenceHtml, {
                            allowTaint: true,
                            letterRendering: true,
                            width: options.thumbnailWidth,
                            height: options.thumbnailHeight,
                            onrendered: function(canvas) {
                                // canvas is the final rendered <canvas> element
                                console.log(referenceHtml);
                                console.log(canvas);
                                theGrid.grid[rows][cols] = {
                                    element: $reference,
                                    order: $reference.data("order"),
                                    html: referenceHtml,
                                    row: parseInt($reference.data("row")),
                                    col: parseInt($reference.data("col")),
                                    thumbnail: canvas
                                }
                                $(canvas).addClass('lattice-thumbnail').appendTo(".lattice-thumbnail-map").css({
                                    'clear': clearValue,
                                    'display': 'block',
                                    'float': 'left',
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
                        });
                    } else {
                        theGrid.grid[rows][cols] = {
                            element: $reference,
                            order: $reference.data("order"),
                            html: $('<div>').append($reference.clone()).html(),
                            row: parseInt($reference.data("row")),
                            col: parseInt($reference.data("col"))
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

            //Draw the grid

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
            if(options.transition === 'slide') slide(); 

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

        }); // end each     
        
        return this;

    } // End plugin. Go eat cake.
    
})(jQuery);