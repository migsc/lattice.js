/*!
 * jQuery Lattice Plugin
 * Original author: @chateloinus
 * Licensed under the MIT license
 */


(function($) {
    
    $.fn.lattice = function(options) {

        // set default options
        var defaults = {
            startSelector: ">:first-child",
            speed : 3000,
            pause : 40000,
            transition : 'fade'
        },

        // Take the options that the user selects, and merge them with defaults.
        options = $.extend(defaults, options);
        
        // Needed to fix a tiny bug. If the pause is less than speed, it'll cause a flickr.
        // This will check for that, and if it is smaller, it increases it to just about the options.speed.
        if(options.pause <= options.speed) options.pause = options.speed + 100;
    
        // for each item in the wrapped set
        return this.each(function() {
        
            // cache "this."
            var $this = $(this);

            // Wrap "this" in a div with a class of "slider-wrap."
            $this.wrap('<div class="slider-wrap" />');

            // Set the width to a really high number. Adjusting the "left" css values, so need to set positioning.
            $this.css({
                'width' : '99999px',
                'position' : 'relative',
                'padding' : 0,
                'float': 'left',
                'width': '500px',
                'height': '400px',
                'overflow': 'hidden',
            });

            var slides = {
                list: [],
                gridCols: 0,
                gridRows: 0,
                grid: [],
                active:{
                    row: null,
                    col: null
                },
                next: null,
            };

            //Set the active slide
            var $active = $this.find(options.startSelector);
            $active.toggleClass("active");
            slides.active.row = parseInt($active.attr("data-row"));
            slides.active.col = parseInt($active.attr("data-col"));

            $this.children().each(function(i){

                if(slides.gridRows < $(this).attr("data-row")) slides.gridRows = $(this).attr("data-row");
                if(slides.gridCols < $(this).attr("data-col")) slides.gridCols = $(this).attr("data-col");

                slides.list.push({
                    element: this,
                    order: $(this).attr("data-order"),
                    html: $('<div>').append($(this).clone()).html(),
                    row: parseInt($(this).attr("data-row")),
                    col: parseInt($(this).attr("data-col")),
                    topRef: false,
                    bottomRef: false,
                    leftRef: false,
                    rightRef: false
                });

            });
            
            //Fill two dimensional grid array with default values
            for(var rows = 0; rows <= slides.gridRows; rows++){
                slides.grid[rows] = [];    
                for(var cols = 0; cols <= slides.gridCols; cols++){ 
                    slides.grid[rows][cols] = false;    
                }    
            }

            //Insert panels into the appropriate spots in the grid
            console.log(slides.list);
            $.each(slides.list, function(index, cell) {
                slides.grid[cell.row][cell.col] = cell;
            });

            //Insert references
            $.each(slides.list, function(index, cell) {

                //Set up reference
                if(cell.row > 0){
                    slides.grid[cell.row][cell.col].topRef = slides.grid[cell.row-1][cell.col];
                } else {
                    slides.grid[cell.row][cell.col].topRef = false;
                }

                //Set down reference
                if(cell.row < slides.gridRows){
                    slides.grid[cell.row][cell.col].bottomRef = slides.grid[cell.row+1][cell.col];
                } else {
                    slides.grid[cell.row][cell.col].bottomRef = false;
                }

                //Set left reference
                if(cell.col > 0){
                    slides.grid[cell.row][cell.col].leftRef = slides.grid[cell.row][cell.col-1];
                } else {
                    slides.grid[cell.row][cell.col].leftRef = false;
                }

                //Set right reference
                if(cell.col < slides.gridCols){
                    slides.grid[cell.row][cell.col].rightRef = slides.grid[cell.row][cell.col+1];
                } else {
                    slides.grid[cell.row][cell.col].rightRef = false;
                }

            });
            console.log(slides.grid);

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
                
                $('.slider-wrap').css({
                    'width' : $this.children().width(),
                    'overflow' : 'hidden',
                });
                $('.slider-wrap .active').show();
            }

            console.log(slides);
            
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
                
                slides.active.col = $target.attr("data-col");
                slides.active.row = $target.attr("data-row");
            }

            function slide() {
                setInterval(function() {
                    var activeRow = parseInt($(".active").attr("data-row")),
                        activeCol = parseInt($(".active").attr("data-row")),
                        activeOrder = parseInt($(".active").attr("data-order")),
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

                    if(parseInt($target.attr("data-row")) > activeRow) {
                        direction = "bottom";
                    } else if(parseInt($target.attr("data-row")) < activeRow) {
                        direction = "top";
                    } else if(parseInt($target.attr("data-col")) > activeCol) {
                        direction = "right";
                    } else if(parseInt($target.attr("data-col")) < activeCol) {
                        direction = "left";
                    }

                    console.log(direction);                    
                    travelTo($target, direction);

                }, options.pause);
            } // end slide

            function convertCssToInt( measurement ){
                return parseInt(measurement.replace("px",""));
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

        }); // end each     
    
    } // End plugin. Go eat cake.
    
})(jQuery);