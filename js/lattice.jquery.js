/*!
 * Lattice v0.5
 * A jQuery plugin to slide HTML elements in a grid like fashion
 * Original author: @chateloinus
 * Licensed under the MIT license
 */

;(function($, window, document, undefined) {

    "use strict";

    var pluginName = "lattice",
        config = {},
        defaults = { //Public configuration
            startSelector: ">:first-child",
            fullscreen: false,
            debug: false,
            speed : 1000,
            crop: "center",
            scale: "none",
            adjacentEasing: "swing",
            nonAdjacentEasing: "linear",
            thumbnailMapEnabled : true,
            thumbnailWidth : 15,
            thumbnailHeight: 15,
            thumbnailSpacing: 3,
            thumbnailMapHideDuration: 200,
            thumbnailMapShowDuration: 700,
            usePathCaching: false,
            selfThumbedCells: [],
            gutter: "1%",
            html2Canvas: false,
            thumbnailActiveClass: "lattice-thumbnail-active",
            containerClass: "lattice-container",
            html : {
                wrapper:            "<div id=\"lattice-wrap\" style=\"position:relative;overflow:hidden;\" allowfullscreen=\"true\"></div>",
                thumbnailDefault:   "<div class=\"lattice-thumbnail\"></div>",
                thumbnailEmpty:     "<div class=\"lattice-thumbnail-empty\"></div>",
                thumbnailMap:       "<div id=\"lattice-thumbnail-map\" style=\"position:absolute;bottom:15px;right:15px\"></div>"
            },
            styles : {
            },
            sliderWidth: "100%",
            sliderHeight: "600px"
        },
        methods = { //Public methods
        },
        privates = { //Private configuration
            grid: [],
            inMotion: false,
            compareNumbers: function (a, b) { return a - b; },
            active:{
                row: null,
                col: null
            },
            compassDict: {
                north : {
                    toCss: function(row, col){
                        return {"margin-top" : -((row - 1) * $("#lattice-wrap").height()) + "px"};
                    },
                    offsetR: -1,
                    offsetC: 0
                },
                south : {
                    toCss: function(row, col){
                        return {"margin-top" : -((row + 1) * $("#lattice-wrap").height()) + "px"};
                    },
                    offsetR: 1,
                    offsetC: 0
                },
                east : {
                    toCss: function(row, col){
                        return {"margin-left" : -((col + 1) * 100) + "%"};
                    },
                    offsetR: 0,
                    offsetC: 1
                },
                west : {
                    toCss: function(row, col){
                        return {"margin-left" : -((col - 1) * 100) + "%" };
                    },
                    offsetR: 0,
                    offsetC: -1
                }
            },
            cropDict: {
                middle : function(h){
                    return { "top" : "50%", "margin-top" : (h/-2) + "px" };
                },
                center : function(w){ 
                    return { "left" : "50%", "margin-left" : (w/-2) + "px" };
                },
                top : { "top" : "0" },
                bottom : { "bottom" : "0" },
                left : { "left" : "0" },
                right : { "right" : "0" }
            },
            pathCache: {}
        };


    var activateFullScreen = function(){
        var slider = $("#lattice-wrap");
        if (slider[0].requestFullScreen) {
            slider[0].requestFullScreen();
        } else if (slider[0].mozRequestFullScreen) {
            slider[0].mozRequestFullScreen();
        } else if (slider[0].webkitRequestFullscreen) {
            slider[0].webkitRequestFullscreen();
        }

    };

    var deactivateFullScreen = function(){
        var slider = $("#lattice-wrap");
        if (slider[0].cancelFullscreen) {
            slider[0].cancelFullscreen();
        } else if (slider[0].mozRequestFullScreen) {
            slider[0].mozCancelFullScreen();
        } else if (slider[0].webkitRequestFullscreen) {
            slider[0].webkitCancelFullscreen();
        }
    };

    var updateActiveThumbnail = function (row, col) {
        $("#lattice-thumbnail-map ." + config.thumbnailActiveClass).toggleClass(config.thumbnailActiveClass);
        var selector = "#lattice-thumbnail-map " + ".lattice-grid-link#L" + row + "-" + col + " .lattice-thumbnail";
        $(selector).toggleClass(config.thumbnailActiveClass);
    };

    var updateActiveCell = function (row, col) {
        config.active.row = row;
        config.active.col = col;
    };

    var hideThumbnailMap = function () {
        $("#lattice-thumbnail-map").hide(config.thumbnailMapHideDuration);
    };

    var showThumbnailMap = function () {
        $("#lattice-thumbnail-map").show(config.thumbnailMapShowDuration)
            .css("display", "inline");
    };

    var extendShallow = function () {
        for (var i = 1; i < arguments.length; i++) {
            for (var prop in arguments[i]) {
                if (arguments[i].hasOwnProperty(prop)) {
                    arguments[0][prop] = arguments[i][prop];
                }
            }
        }
        return arguments[0];
    };

    var cropPositionToStyle = function (position, dimensionLength) {
        if (config.cropDict.hasOwnProperty(position)) {
            if (typeof config.cropDict[position] === "function") {
                return config.cropDict[position](dimensionLength);
            } else {
                return config.cropDict[position];
            }
        } else {
            return {};
        }
    };

    var getCropStyles = function (cropOption, $reference) {
        var optionPair = cropOption.split("-");
        return extendShallow(
            cropPositionToStyle(optionPair[0], $reference.height() || $reference[0].naturalHeight || $reference[0].src.height),
            cropPositionToStyle(optionPair[1], $reference.width() || $reference[0].naturalWidth || $reference[0].src.width)
        );
    };

    var slideOnPath = function (path){

        if (path.length > 1 || !path ) {

            var index = 0,
                pause = config.speed;
            var isAdjacentToDestination = ( index == path.length - 2 );

            updateActiveThumbnail( path[index+1].row,
                path[index+1].col);
            animateSlide( path[index], path[index+1], false,
                isAdjacentToDestination);
            index++;

            window.setInterval(function(){
                if( (index+1) == path.length){
                    return;
                }

                if( index == 0) {
                    pause = 0;
                }

                lattlog("Taking slide " + index + " in the " +
                    path[index].directionTaken + " direction.")

                updateActiveThumbnail( path[index+1].row,
                    path[index+1].col);

                var prevNode = index > 0 ? path[index-1] : false,
                    isAdjacentToDestination = ( index == path.length -
                        2 );

                animateSlide( path[index], path[index+1], prevNode,
                    isAdjacentToDestination);

                index++;

            }, pause);

        }


        config.inMotion = false;
    };

    var animateSlide = function (fromNode, toNode, prevNode, isAdjacentToDestination){

        var easing = isAdjacentToDestination ? config.adjacentEasing : config.nonAdjacentEasing,
            animCss = translateDirectionToCss(fromNode.directionTaken, fromNode.row, fromNode.col),
            animOptions = {};

        animOptions[animCss.prop] = animCss.val;

        $(".lattice-container").animate(animOptions, config.speed, easing);

        config.active.col = toNode.col;
        config.active.row = toNode.row;
    };

    var translateDirectionToCss = function(direction, row, col){
        var translation = {};

        if(direction === "north" || direction === "south") {
            translation.prop = "margin-top";
            if( direction === "north"){
                translation.val = -((row - 1) * $("#lattice-wrap").height()) + "px";
            } else {
                translation.val = -((row + 1) * $("#lattice-wrap").height()) + "px";
            }
        } else {
            translation.prop = "margin-left";
            if( direction === "west"){
                translation.val = -((col - 1) * 100) + "%";
            } else {
                translation.val = -((col + 1) * 100) + "%";
            }
        }

        return translation;
    }

    var parseStyle = function (value) {
        if (value.indexOf("px") > -1) {
            return {
                number: parseInt(value.replace("px", "")),
                type: "px"
            };
        }

        if (value.indexOf("%") > -1) {
            return {
                number: parseInt(value.replace("%", "")),
                type: "%"
            };
        }

        return {
            number: 0,
            type: ""
        };
    };

    var getMaxData = function ($parent, name) {
        return  $parent.children().map(function () {
            return parseInt($(this).data(name));
        }).get().sort(function (a, b) {
                return b - a;
            })[0];
    };

    var solveGrid = function (start, end, grid) {

        var cacheIndex = start.cellName + "_" + end.cellName,
            path = [];

        if (config.usePathCaching && config.pathCache.hasOwnProperty(cacheIndex)) {
            return config.pathCache[cacheIndex];
        }

        resetGridVisits();

        if (depthFirstSearch(start, end, grid, path) != null) {
            config.pathCache[cacheIndex] = path.reverse();
            return path;
        }

        return null;
    };

    var depthFirstSearch = function (start, end, grid, path) {

        //Check if we're already at the goal
        if (start.row == end.row && start.col == end.col) {
            path.push(extendShallow(grid[start.row][start.col], {visited:true, directionTaken:"none"}));
            return path;
        }

        var generalCompass = config.grid[start.row][start.col].adjacents,
            checkOrder = [],
            biases = {
                north: start.row > end.row,
                east: start.col < end.col,
                south: start.row < end.row,
                west: start.col > end.col
            };

        for(var direction in biases)
            if(biases.hasOwnProperty(direction))
                checkOrder[ biases[direction] ? "unshift" : "push" ](direction);

        for(var i = 0; i < checkOrder.length; i++){
            var direction = checkOrder[i];
            if (generalCompass.hasOwnProperty(direction) && generalCompass[direction]) {

                lattlog(generalCompass[direction]);
                lattlog("Checking " + generalCompass[direction].row + ":" +
                    generalCompass[direction].col + " to the " + direction);

                if (grid[start.row][start.col][direction] && !generalCompass[direction].visited) {

                    lattlog("Room is open. Going " + direction + ".");
                    grid[start.row][start.col].visited = true;
                    if (depthFirstSearch(generalCompass[direction], end, grid, path) != null) {
                        grid[start.row][start.col].directionTaken = direction;
                        path.push(grid[start.row][start.col]);
                        return path;
                    }

                }

                lattlog("Closed.");
            }
        }

        lattlog("Reached a dead end.");
        //If we get here, it"s a dead end!
        return null;
    };

    var resetGridVisits = function () {
        for (var rows = 0; rows <= config.gridRows; rows++) {
            for (var cols = 0; cols <= config.gridCols; cols++) {
                config.grid[rows][cols].visited = false;
            }
        }
    };

    var addThumbnailToMap = function (customCss, thumbnail, clearValue, row, col) {

        if (row === null || col === null) return;

        var idValue = "id=\"L" + row + "-" + col + "\" ";

        $(thumbnail).appendTo("#lattice-thumbnail-map").css({
            "clear": clearValue,
            "display": "block",
            "float": "left",
            "width": config.thumbnailWidth + "px",
            "height": config.thumbnailHeight + "px",
            "margin": config.thumbnailSpacing + "px"
        }).css(customCss).wrap("<a class=\"lattice-grid-link\" href=\"#\"" + idValue + " ></a>");
    };

    var setCellProperties = function (row, col, props) {

        if (!props) {
            config.grid[row][col] = false;
            return;
        }

        if (typeof config.grid[row][col] === "undefined") {
            config.grid[row][col] = {};
        }

        for (var propName in props) {
            if (props.hasOwnProperty(propName)) {
                config.grid[row][col][propName] = props[propName];
            }
        }
    };

    var lattlog = function (mixed) {
        if (config.debug && window.console && window.console.log) {
            console.log(mixed);
        }
    };

    function Plugin( element, options ) {
        this.element = element;
        config = $.extend( {}, defaults, options, privates) ;
        this.init();
    }

    Plugin.prototype.init = function () {
        //Add some global stylings to the document
        $("body").append(function () {
            var block = "";
            for (var section in config.styles) {
                if (config.styles.hasOwnProperty(section)) {
                    block += config.styles[section];
                }
            }
            return "<style type=\"text/css\">" + block + "</style>";
        });

        // Cache "this"
        var $this = $(this.element);

        // Cache the grid size
        config.gridRows = getMaxData($this, "row");
        config.gridCols = getMaxData($this, "col");

        config.containerContext = $this.context;

        $this.children().css({
            "list-style": "none",
            "position": "absolute",
            "display": "block"
        });

        /*
         * Wrap "this" in a div with a class and set some styles. Adjusting
         * the "left" css values, so need to set positioning.
         */
        $this.css({
            "position": "relative",
            "width": (config.gridCols + 1) * 100 + "%",
            "height": (config.gridRows + 1) * 100 + "%"
        }).addClass(config.containerClass).wrap(config.html.wrapper);

        $("#lattice-wrap").css({
            "width": config.sliderWidth,
            "height": config.sliderHeight
        });

        if (config.thumbnailMapEnabled) {
            //Add the thumbnail map
            $(config.html.thumbnailMap)
                .appendTo("#lattice-wrap")
                .width(function () {
                    config.thumbnailMapWidth =
                        ( config.thumbnailWidth + ( 2 * config.thumbnailSpacing ) ) * (config.gridCols + 1);
                    return config.thumbnailMapWidth;
                }).height(function () {
                    config.thumbnailMapHeight =
                        ( config.thumbnailHeight + ( 2 * config.thumbnailSpacing ) ) * (config.gridRows + 1);
                    return config.thumbnailMapHeight;
                });
        }


        /*
         * Build the grid array while creating thumbnails and setting
         * available paths along the way
         */
        for (var r = 0; r <= config.gridRows; r++) {

            config.grid[r] = [];

            for (var c = 0; c <= config.gridCols; c++) {

                // Cache the reference to the cell"s element
                var $reference = $this.find("[data-row=" + r + "][data-col=" +
                        c + "]"),
                    clearValue = ( c == config.gridCols ) ?
                        "right" : "none",
                    selfThumbed = false;

                if ($reference.length === 0) {

                    /**
                     * If an element doesn"t exist for this cell, we"ll
                     * use the default empty placeholder
                     */
                    setCellProperties(r, c, false);
                    addThumbnailToMap({
                            "background": "none"
                        }, config.html.thumbnailEmpty, clearValue, r,
                        c);

                } else {

                    /**
                     * This element does exist. We"ll create the thumbnail,
                     * set the cell properties in our global, and add some
                     * positioning for the actual element.
                     */
                    var thumbData = $reference.data("thumb");
                    if (thumbData === "self" && $reference.is("images")) {

                        //The element itself is an image and will be thumbed
                        var thumb = $("<images class=\"lattice-thumbnail\">");
                        thumb.attr("src", $reference.attr("src"));

                        addThumbnailToMap({}, thumb, clearValue, r, c);

                    } else if (thumbData === "self" && config.html2Canvas) {

                        //NOT an image so it will be thumbed into a canvas
                        addThumbnailToMap({
                                "background-repeat": "no-repeat",
                                "background-size": ((config.gridCols + 1) * config.thumbnailWidth ) +
                                    "px " +
                                    ((config.gridRows + 1) * config.thumbnailHeight) +
                                    "px",
                                "background-position": ( -c * config.thumbnailWidth ) + "px " +
                                    ( -r * config.thumbnailHeight) + "px",
                                "background-color": "#fffff"
                            }, config.html.thumbnailDefault, clearValue, r,
                            c);
                        selfThumbed = true;

                    } else if (thumbData && thumbData !== "self") {

                        //Some selector for an image in the thumb-data attr
                        //TODO: Make this happen
                        addThumbnailToMap({},
                            $("<div>").append(
                                $(thumbData).addClass("lattice-thumbnail")
                                    .clone()
                            ).html(),
                            clearValue, r, c);
                    } else {

                        //No thumb-data attr so use the default thumb
                        addThumbnailToMap({
                                "background-color": "#ffffff"
                            }, config.html.thumbnailDefault, clearValue, r,
                            c);
                    }

                    var cropData = $reference.data("crop"),
                        scaleData = $reference.data("scale");

                    setCellProperties(r, c, {
                        element: $reference,
                        cellName: r + "x" + c,
                        html: $("<div>").append($reference.clone()).html(),
                        row: parseInt($reference.data("row")),
                        col: parseInt($reference.data("col")),
                        travel: $reference.data("travel"),
                        visited: false,
                        north: false,
                        south: false,
                        east: false,
                        west: false,
                        oWidth: $reference.width(),
                        oHeight: $reference.height(),
                        adjacents: {},
                        crop: cropData ? cropData : config.crop,
                        scale: scaleData ? scaleData : config.scale
                    });

                    if (selfThumbed) {
                        config.selfThumbedCells.push(config.grid[r][c]);
                    }

                    var cellStyling =
                            "width:" + (1 / (config.gridCols + 1)) * 100 + "%;" +
                                "height:" + (1 / (config.gridRows + 1)) * 100 + "%;" +
                                "position:absolute;" +
                                "left:" + (c / (config.gridCols + 1)) * 100 + "%;" +
                                "top:" + (r / (config.gridRows + 1)) * 100 + "%;",
                        innerCellStyling =
                            "position:relative;" +
                                "overflow:hidden;" +
                                "height:100%;" +
                                "width:100%;" +
                                "margin:0";

                    $reference.wrap(
                        "<div id=\"cell" + r + "-" + c + "\" class=\"lattice-cell\" style=\"" + cellStyling + "\">" +
                            "<div class=\"lattice-cell-inner\" style=\"" + innerCellStyling + "\"></div>" +
                        "</div>"
                    );

                    var scale = config.grid[r][c].scale;
                    if (scale.indexOf("height") > -1 && scale.indexOf("width") > -1) {
                    } else if (scale.indexOf("width") > -1) {
                        $reference.css({
                            "width": "100%",
                            "max-width": $reference.width(),
                            "height": "auto"
                        });
                    } else if (scale.indexOf("height") > -1) {
                        $reference.css({
                            "width": "auto",
                            "height": "100%",
                            "max-height": $reference.height()
                        });
                    }

                }

                if (config.grid[r][c] && config.grid[r][c].travel) {

                    // Define available paths for that cell based on the travel data attribute
                    $.each(config.grid[r][c].travel.split(","),
                        function (index, value) {
                            config.grid[r][c][value] = true;
                        }
                    );

                } else {

                    //No path data attribute? Go by adjacency
                    for (var direction in config.compassDict) {
                        if (config.compassDict.hasOwnProperty(direction)) {
                            //TODO: Find a faster way of doing this
                            var adjacentCellSelector =
                                    "[data-row=" + (r + config.compassDict[direction].offsetR) +
                                        "][data-col=" + (c + config.compassDict[direction].offsetC) + "]",
                                travelProp = {};

                            if ($(adjacentCellSelector).length != 0) {
                                travelProp[direction] = true;
                                setCellProperties(r, c, travelProp);
                            } else {
                                travelProp[direction] = false;
                                setCellProperties(r, c, travelProp);
                            }

                        }
                    }

                }

            } //end col loop

        }//end row loop

        //Now set the gutters for each cell.
        config.gutter = parseStyle(config.gutter);
        if (config.gutter.type === "px") {

            var hGutter = (config.gutter.number / config.sliderWidth) * 100,
                vGutter = (config.gutter.number / config.sliderHeight) * 100;

            $(".lattice-cell-inner").css({
                "margin": "0 auto",
                "width": 100 - 2 * (hGutter) + "%",
                "height": 100 - 2 * (vGutter) + "%",
                "top": vGutter + "% "
            });
        } else if (config.gutter.type === "%") {
            $(".lattice-cell-inner").css({
                "margin": "0 auto",
                "width": 100 - (2 * config.gutter.number) + "%",
                "height": 100 - (2 * config.gutter.number) + "%",
                "top": config.gutter.number + "% "
            });
        }

        //Set the active slide
        var $active = $this.find(config.startSelector);
        $active.toggleClass("active");

        updateActiveCell(parseInt($active.data("row")), parseInt($active.data("col")));

        if ($("[data-thumb=self]").length > 0 && config.html2Canvas) {
            html2canvas($("#container"), {
                useOverflow: true,
                onpreloaded: function () {
                    $("#lattice-wrap").css("overflow", "visible");
                    $this.css({
                        "margin-top": "0px",
                        "margin-left": "0px"
                    });
                },
                onrendered: function (canvas, rows, cols) {
                    var style = $("<style>.lattice-thumbnail-self {" +
                        " background-image: url(" +
                        canvas.toDataURL("image/png") +
                        "); }</style>");
                    $("html > head").append(style);

                    $("#lattice-wrap").css("overflow", "hidden");
                    config.gridImage = canvas.toDataURL("image/png");

                    $this.css({
                        "margin-top": -( config.active.row *
                            config.sliderHeight ) + "px",
                        "margin-left": -( config.active.col *
                            config.sliderWidth ) + "px"
                    });
                    for (var i = 0; i < config.selfThumbedCells.length; i++) {
                        var cell = config.selfThumbedCells[i];
                        var selector = "#L" +
                            cell.row + "-" + cell.col +
                            " .lattice-thumbnail";
                        $(selector).addClass("lattice-thumbnail-self");
                    }
                }
            });
        }

        //Move the container to the chosen slide to be the first active.
        $this.css({
            "margin-top": ((config.active.row) * -100) + "%",
            "margin-left": ((config.active.col) * -100) + "%"
        });

        updateActiveThumbnail(config.active.row, config.active.col);
        hideThumbnailMap();

        //Some more setup for the grid, now that all the cells are defined
        for (var rows = 0; rows <= config.gridRows; rows++) {
            for (var cols = 0; cols <= config.gridCols; cols++) {

                config.grid[rows][cols].adjacents = {
                    north: (rows - 1) < 0 ? false : config.grid[rows - 1][cols],
                    south: (rows + 1) >= config.grid.length ?
                        false : config.grid[rows + 1][cols],
                    east: (cols + 1) >= config.grid[0].length ?
                        false : config.grid[rows][cols + 1],
                    west: (cols - 1) < 0 ?
                        false : config.grid[rows][cols - 1]
                };


            }
        }

        /******************************
         * EVENTS
         */

        $(window).resize(function () {

            for (var r = 0; r < config.grid.length; r++) {
                for (var c = 0; c < config.grid[0].length; c++) {
                    if (config.grid[r][c]) {

                        var $element = config.grid[r][c].element;
                        var $inner = $element.parent(".lattice-cell-inner"),
                            crop = config.grid[r][c].crop,
                            scale = config.grid[r][c].scale;

                        if (scale.indexOf("height") > -1 &&
                            scale.indexOf("width") > -1) {
                            if ($element.is("images")) {
                                var widthE = config.grid[r][c].oWidth,
                                    heightE = config.grid[r][c].oHeight,
                                    widthI = $inner.width(),
                                    heightI = $inner.height();

                                var ratioW = heightE / widthE,
                                    ratioH = widthE / heightE;

                                if (widthE > widthI) {
                                    widthE = widthI;
                                    heightE = widthE * ratioW;
                                }

                                if (heightE > heightI) {
                                    heightE = heightI;
                                    widthE = heightE * ratioH;
                                }
                            } else {
                                var widthE = "100%",
                                    heightE = "100%";
                            }

                            $element.css({
                                "width": widthE,
                                "height": heightE
                            })

                        }

                        if ($inner.width() >= $element.width() ||
                            scale.indexOf("width") > -1) {
                            crop = crop.slice(0, crop.indexOf("-")) + "-center";
                        }

                        if ($inner.height() >= $element.height() ||
                            scale.indexOf("height") > -1) {
                            crop = "middle" + crop.slice(crop.indexOf("-"), crop.length);
                        }

                        $element.css(getCropStyles(crop, $element));
                    }
                }
            }

        }).trigger("resize");

        $("#lattice-wrap").bind("mousemove", function(e){
            var wrapOffset = $("#lattice-wrap").offset(),
                mapPosition = $("#lattice-thumbnail-map").position();

            var mouseX = e.pageX - wrapOffset.left,
                mouseY = e.pageY - wrapOffset.top;

            var bounds = [
                    mapPosition.left,
                    mouseX,
                    mapPosition.left + config.thumbnailMapWidth
                ].sort(config.compareNumbers).concat([
                    mapPosition.top,
                    mouseY,
                    mapPosition.top + config.thumbnailMapHeight
                ].sort(config.compareNumbers));

            if(!(mouseX === bounds[1] && mouseY === bounds[5])){
                showThumbnailMap();
            } else {
                hideThumbnailMap();
            }
        });

        $(".lattice-grid-link").click(function (e) {

            e.preventDefault();
            if (config.inMotion) {
                return;
            }

            config.inMotion = true;
            var coords = $(this)[0].id.replace("L", "").split("-");
            var path = solveGrid(
                config.grid[config.active.row][config.active.col],
                config.grid[coords[0]][coords[1]], config.grid
            );

            slideOnPath(path);
        });

    }; //end init method

    $.fn[pluginName] = function(methodOrOptions){
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {

                if ( methods[methodOrOptions] ) {
                    return methods[ methodO1rOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ));
                } else if ( typeof methodOrOptions === "object" || ! methodOrOptions ) {
                    // Default to "init"
                    $.data(this, "plugin_" + pluginName, new Plugin( this, methodOrOptions ));
                } else {
                    $.error( "Method " +  methodOrOptions + " does not exist on jQuery." + pluginName );
                }

            }
        });
    };


})(jQuery, window, document);

