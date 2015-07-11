/*!
 * Lattice v0.5
 * A jQuery plugin to slide HTML elements in a grid like fashion
 * Original author: @chateloinus
 * Licensed under the MIT license
 */

;(function($, window, document, undefined) {

    "use strict";

    var ID_OR_CLASS_PREFIX = /\.|#/;

    var pluginName = "lattice",
        config = {},
        methods = { //Public methods
            setCell: function(row, col, properties){
                setCellProperties(row, col, properties);
            },
            setFullscreen: function(command){
                if(command === "on"){
                    activateFullScreen();
                } else {
                    deactivateFullScreen();
                }
            },
            setThumbnailMap: function(command){
                if(command === "show"){
                    showThumbnailMap();
                } else {
                    hideThumbnailMap();
                }
            },
            slideTo: function(row, col){
                if(row === config.active.row && col === config.active.col) {
                    return;
                }

                var path = getPath(
                    config.grid[config.active.row][config.active.col],
                    config.grid[row][col], config.grid
                );
                config.onPathSolved(path);
                slideOnPath(path);
            }

        },
        defaults = { //Public configuration
            startSelector: ">:first-child",
            fullscreen: false,
            sliderWidth: "100%",
            sliderHeight: "600px",
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
            interruptMotion: false,
            selectors: {
                wrapperId: "#lattice-wrap",
                cell: "#lattice-cell-%s",
                cells: ".lattice-cell",
                cellActive: ".lattice-cell-active",
                cellInner: ".lattice-cell-inner",
                gridLink: ".lattice-grid-link",
                thumbnail: ".lattice-thumbnail",
                thumbnailEmpty: ".lattice-thumbnail-empty",
                thumbnailActive: ".lattice-thumbnail-active",
                thumbnailMap: "#lattice-thumbnail-map",
                container: ".lattice-container"
            },
            //Callbacks
            onSlide: function(fromCell, toCell, prevCell, isAdjacentToDestination){},
            onSlidePathStarted: function(){},
            onSlidePathEnded: function(){},
            onUpdatedCell: function(cellProperties, row, col){},
            onActiveThumbnailChange: function(element, row, col){},
            onPathSolved: function(path){},
            onInit: function(grid){}
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
                    dimension: "row",
                    css: {
                        property:"margin-top",
                        units: "px",
                        multiplier: function(wrapperSelector){ return $(wrapperSelector).height(); }
                    },
                    offset: {
                        row: -1,
                        col: 0
                    }
                },
                south : {
                    dimension: "row",
                    css: {
                        property:"margin-top",
                        units: "px",
                        multiplier: function(wrapperSelector){ return $(wrapperSelector).height(); }
                    },
                    offset: {
                        row: 1,
                        col: 0
                    }
                },
                east : {
                    dimension: "col",
                    css: {
                        property:"margin-left",
                        units: "%",
                        multiplier: function(){ return 100; }
                    },
                    offset: {
                        row: 0,
                        col: 1
                    }
                },
                west : {
                    dimension: "col",
                    css: {
                        property:"margin-left",
                        units: "%",
                        multiplier: function(){ return 100; }
                    },
                    offset: {
                        row: 0,
                        col: -1
                    }
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
        var slider = $(config.selectors.wrapperId);

        if (slider[0].requestFullScreen) {
            slider[0].requestFullScreen();
        } else if (slider[0].mozRequestFullScreen) {
            slider[0].mozRequestFullScreen();
        } else if (slider[0].webkitRequestFullscreen) {
            slider[0].webkitRequestFullscreen();
        }

    };

    var deactivateFullScreen = function(){
        var slider = $(config.selectors.wrapperId);
        if (slider[0].cancelFullscreen) {
            slider[0].cancelFullscreen();
        } else if (slider[0].mozRequestFullScreen) {
            slider[0].mozCancelFullScreen();
        } else if (slider[0].webkitCancelFullscreen) {
            slider[0].webkitCancelFullscreen();
        }

    };

    var updateActiveThumbnail = function (row, col) {
        $(config.selectors.thumbnailMap + " " + config.selectors.thumbnailActive)
            .toggleClass(config.selectors.thumbnailActive.replace(ID_OR_CLASS_PREFIX, ""));
        var selector =
            config.selectors.thumbnailMap + " " +
            config.selectors.gridLink + "#L" + row + "-" + col + " " +
            config.selectors.thumbnail;
        $(selector).toggleClass(config.selectors.thumbnailActive.replace(ID_OR_CLASS_PREFIX, ""));
        if(config.ready){
            config.onActiveThumbnailChange($(selector), row, col);
        }
    };

    var hideThumbnailMap = function () {
        $(config.selectors.thumbnailMap).hide(config.thumbnailMapHideDuration);
    };

    var showThumbnailMap = function () {
        $(config.selectors.thumbnailMap).show(config.thumbnailMapShowDuration)
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

    var toCss = function(direction, row, col){
        var result = {},
            cd = config.compassDict[direction];
        var dimensionValue = cd.dimension === "row" ? row : col;
        result[cd.css.property] = -((dimensionValue + cd.offset[cd.dimension]) * cd.css.multiplier(config.selectors.wrapperId)) + cd.css.units;
        return result;
    };

    var slideOnPath = function (path){
        if (path.length <= 1){
            config.inMotion = false;
            return;
        }

        var index = 1,
            isAdjacentToDestination = ( 0 === path.length - 2 );
        updateActiveThumbnail( path[index].row, path[index].col);
        animateSlide( path[index-1], path[index], false, isAdjacentToDestination);

        config.interval = window.setInterval(function(){

            if( (index+1) === path.length){
                clearInterval(config.interval);
                config.onSlidePathEnded();
                config.inMotion = false;
                return;
            }

            var prevCell = index > 0 ? path[index-1] : false,
                isAdjacentToDestination = ( index === path.length - 2 );

            updateActiveThumbnail( path[index+1].row, path[index+1].col);
            animateSlide( path[index], path[index+1], prevCell, isAdjacentToDestination);
            index++;

        }, config.speed);

    };

    var animateSlide = function (fromCell, toCell, prevCell, isAdjacentToDestination){

        var easing = isAdjacentToDestination ? config.adjacentEasing : config.nonAdjacentEasing,
            animOptions = toCss(fromCell.directionTaken, fromCell.row, fromCell.col);

        config.onSlide(fromCell, toCell, prevCell, isAdjacentToDestination);
        $(config.selectors.container).animate(animOptions, config.speed, easing);

        config.active.col = toCell.col;
        config.active.row = toCell.row;
    };

    var parseStyle = function (value) {
        if (value.indexOf("px") > -1) {
            return {
                number: parseInt(value.replace("px", ""), 10),
                type: "px"
            };
        }

        if (value.indexOf("%") > -1) {
            return {
                number: parseInt(value.replace("%", ""), 10),
                type: "%"
            };
        }

        return {
            number: 0,
            type: ""
        };
    };

    var getMaxData = function ($parent, name) {
        return  $parent
            .children()
            .map(function () {
                return parseInt($(this).data(name), 10);
            })
            .get()
            .sort(function (a, b) {
                return b - a;
            })[0];
    };

    var getPath = function (start, end, grid) {
        var cacheIndex = start.cellName + "_" + end.cellName,
            path = [];
        config.inMotion = true;

        if (config.usePathCaching && config.pathCache.hasOwnProperty(cacheIndex)) {
            return config.pathCache[cacheIndex];
        }
        resetGridVisits();

        if (depthFirstSearch(start, end, grid, path) !== null) {
            config.pathCache[cacheIndex] = path.reverse();
            return path;
        }

        return null;
    };

    var depthFirstSearch = function (start, end, grid, path) {

        //Check if we're already at the goal
        if (start.row === end.row && start.col === end.col) {
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

        for(var direction in biases){
            if(biases.hasOwnProperty(direction)){
                checkOrder[ biases[direction] ? "unshift" : "push" ](direction);
            }
        }

        for(var i = 0; i < checkOrder.length; i++){
            direction = checkOrder[i];
            if (generalCompass.hasOwnProperty(direction) && generalCompass[direction] &&
                grid[start.row][start.col][direction] && !generalCompass[direction].visited) {

                grid[start.row][start.col].visited = true;

                if (depthFirstSearch(generalCompass[direction], end, grid, path) !== null) {
                    grid[start.row][start.col].directionTaken = direction;
                    path.push(grid[start.row][start.col]);
                    return path;
                }
            }
        }

        //If we get here, it's a dead end!
        return null;
    };

    var resetGridVisits = function () {
        console.log("[resetGridVisits]", config.grid);
        for (var r = 0; r <= config.gridRows; r++) {
            for (var c = 0; c <= config.gridCols; c++) {
                if(config.grid[r][c]){
                    console.log("[resetGridVistis] Resetting row-col: ", r, c);
                    config.grid[r][c].visited = false;
                }
            }
        }
    };

    var addThumbnailToMap = function (customCss, thumbnail, clearValue, row, col) {

        if (row === null || col === null) {
            return;
        }

        var idValue = "id=\"L" + row + "-" + col + "\" ";

        $(thumbnail)
            .appendTo(config.selectors.thumbnailMap)
            .css(extendShallow({
                clear: clearValue,
                display: "block",
                float: "left",
                width: config.thumbnailWidth + "px",
                height: config.thumbnailHeight + "px",
                margin: config.thumbnailSpacing + "px",
                opacity: "0.4"
            }, customCss))
            .wrap("<a class=\"" + config.selectors.gridLink.replace(ID_OR_CLASS_PREFIX, "") + "\" href=\"#\"" + idValue + " ></a>");
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
                if(config.grid[row][col]){
                    config.grid[row][col][propName] = props[propName];
                }
            }
        }

        if(config.ready){
            config.onUpdatedCell(config.grid[row][col], row, col);
        }
    };

    function Plugin( element, options ) {
        this.element = element;
        config = $.extend( {}, defaults, options, privates) ;
         this.init();
    }

    Plugin.prototype.init = function () {
        //Add some global stylings to the document
        $("body").append(
            "<style type=\"text/css\">" +
            config.selectors.wrapperId + ":-moz-full-screen{ height:100% !important; }" +
            config.selectors.wrapperId + ":-webkit-full-screen{ height:100% !important; }" +
            config.selectors.wrapperId + ":full-screen{ height:100% !important; }" +
            "</style>"
        );

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
        $this
            .css({
                "position": "relative",
                "width": (config.gridCols + 1) * 100 + "%",
                "height": (config.gridRows + 1) * 100 + "%"
            }).addClass(config.selectors.container.replace(ID_OR_CLASS_PREFIX, ""))
            .wrap(
                "<div id=\"" + config.selectors.wrapperId.replace(ID_OR_CLASS_PREFIX, "") + "\"></div>"
            );

        $(config.selectors.wrapperId).css({
            position: "relative",
            overflow: "hidden",
            width: config.sliderWidth,
            height: config.sliderHeight
        }).attr({
                allowfullscreen: true
            });

        if (config.thumbnailMapEnabled) {
            //Add the thumbnail map
            $("<div></div>")
                .attr({
                    id: config.selectors.thumbnailMap.replace(ID_OR_CLASS_PREFIX, "")
                })
                .css({
                    position: "absolute",
                    bottom: "15px",
                    right: "15px",
                    width: function () {
                        config.thumbnailMapWidth =
                            ( config.thumbnailWidth + ( 2 * config.thumbnailSpacing ) ) * (config.gridCols + 1);
                        return config.thumbnailMapWidth;
                    },
                    height: function () {
                        config.thumbnailMapHeight =
                            ( config.thumbnailHeight + ( 2 * config.thumbnailSpacing ) ) * (config.gridRows + 1);
                        return config.thumbnailMapHeight;
                    }
                })
                .appendTo(config.selectors.wrapperId);
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
                    clearValue = ( c === config.gridCols ) ?
                        "right" : "none",
                    selfThumbed = false;

                if ($reference.length === 0) {

                    /**
                     * If an element doesn"t exist for this cell, we"ll
                     * use the default empty placeholder
                     */
                    setCellProperties(r, c, false);
                    addThumbnailToMap({ "background": "none"},
                        "<div class=\"" + config.selectors.thumbnailEmpty.replace(ID_OR_CLASS_PREFIX, "") + "\"></div>", clearValue, r, c);

                } else {

                    /**
                     * This element does exist. We"ll create the thumbnail,
                     * set the cell properties in our global, and add some
                     * positioning for the actual element.
                     */
                    var thumbData = $reference.data("thumb");
                    if (thumbData === "self" && $reference.is("images")) {

                        //The element itself is an image and will be thumbed
                        var thumb = $("<images class=\"" + config.selectors.thumbnail.replace(ID_OR_CLASS_PREFIX, "") + "\">");
                        thumb.attr("src", $reference.attr("src"));

                        addThumbnailToMap({}, thumb, clearValue, r, c);

                    } else if (thumbData && thumbData !== "self") {

                        //Some selector for an image in the thumb-data attr
                        addThumbnailToMap({},
                            $("<div>").append(
                                $(thumbData)
                                    .addClass(config.selectors.thumbnail.replace(ID_OR_CLASS_PREFIX, ""))
                                    .clone()
                            ).html(),
                            clearValue, r, c);
                    } else {

                        //No thumb-data attr so use the default thumb
                        addThumbnailToMap({ "background-color": "#ffffff" },
                            "<div class=\"" + config.selectors.thumbnail.replace(ID_OR_CLASS_PREFIX, "") + "\"></div>",
                            clearValue, r, c );
                    }

                    var cropData = $reference.data("crop"),
                        scaleData = $reference.data("scale");

                    setCellProperties(r, c, {
                        element: $reference,
                        cellName: r + "x" + c,
                        html: $("<div>").append($reference.clone()).html(),
                        row: parseInt($reference.data("row"), 10),
                        col: parseInt($reference.data("col"), 10),
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
                        "<div id=\"" + config.selectors.cell.replace(ID_OR_CLASS_PREFIX, "").replace("%s", r + "-" + c) +
                            "\" class=\"" + config.selectors.cells.replace(ID_OR_CLASS_PREFIX, "") +
                            "\" style=\"" + cellStyling + "\">" +
                            "<div class=\"" + config.selectors.cellInner.replace(ID_OR_CLASS_PREFIX, "") +"\" style=\"" + innerCellStyling + "\"></div>" +
                        "</div>"
                    );

                    var scale = config.grid[r][c].scale;
                    if (scale.indexOf("height") > -1 && scale.indexOf("width") > -1) {
                        $reference.css({
                            "width": "100%",
                            "height": "100%"
                        });
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
                    var setPaths = function (index, value) {
                        config.grid[r][c][value] = true;
                    };
                    $.each(config.grid[r][c].travel.split(","), setPaths);

                } else {

                    //No path data attribute? Go by adjacency
                    for (var direction in config.compassDict) {
                        if (config.compassDict.hasOwnProperty(direction)) {
                            var adjacentCellSelector =
                                    config.selectors.wrapperId +
                                    " [data-row=" + (r + config.compassDict[direction].offset.row) +
                                    "][data-col=" + (c + config.compassDict[direction].offset.col) + "]",
                                travelProp = {};

                            if ($(adjacentCellSelector).length !== 0) {
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

            $(config.selectors.cellInner).css({
                "margin": "0 auto",
                "width": 100 - 2 * (hGutter) + "%",
                "height": 100 - 2 * (vGutter) + "%",
                "top": vGutter + "% "
            });
        } else if (config.gutter.type === "%") {
            $(config.selectors.cellInner).css({
                "margin": "0 auto",
                "width": 100 - (2 * config.gutter.number) + "%",
                "height": 100 - (2 * config.gutter.number) + "%",
                "top": config.gutter.number + "% "
            });
        }

        //Set the active slide
        var $active = $this.find(config.startSelector);
        $active.toggleClass(config.selectors.cellActive.replace(ID_OR_CLASS_PREFIX, ""));
        config.active.row = parseInt($active.data("row"), 10);
        config.active.col = parseInt($active.data("col"), 10);

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
                if(config.grid[rows][cols]) {
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
        }

        /******************************
         * EVENTS
         */

        $(window).resize(function () {

            for (var r = 0; r < config.grid.length; r++) {
                for (var c = 0; c < config.grid[0].length; c++) {
                    if (config.grid[r][c]) {

                        var $element = config.grid[r][c].element;
                        var $inner = $element.parent(config.selectors.cellInner),
                            crop = config.grid[r][c].crop,
                            scale = config.grid[r][c].scale;


                        if (scale.indexOf("height") > -1 && scale.indexOf("width") > -1) {
                            var widthE = "100%",
                                heightE = "100%";
                            if ($element.is("images")) {
                                var widthI = $inner.width(),
                                    heightI = $inner.height();
                                widthE = config.grid[r][c].oWidth;
                                heightE = config.grid[r][c].oHeight;

                                if (widthE > widthI) {
                                    widthE = widthI;
                                    heightE = widthE * (heightE / widthE);
                                }

                                if (heightE > heightI) {
                                    heightE = heightI;
                                    widthE = heightE * (widthE / heightE);
                                }
                            }

                            $element.css({
                                "width": widthE,
                                "height": heightE
                            });

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

        $(config.selectors.wrapperId).bind("mousemove", function(e){
            var wrapOffset = $(config.selectors.wrapperId).offset(),
                mapPosition = $(config.selectors.thumbnailMap).position();

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

        $(config.selectors.gridLink).click(function (e) {
            e.preventDefault();

            if (config.inMotion) {
                if(!config.interruptMotion){
                    return;
                }
                clearInterval(config.interval);
            }

            var coords = $(this)[0].id.replace("L", "").split("-");
            var path = getPath(
                config.grid[config.active.row][config.active.col],
                config.grid[coords[0]][coords[1]],
                config.grid
            );
            config.onPathSolved(path);
            slideOnPath(path);
        });

        config.ready = true;
        config.onInit(config.grid);

    }; //end init method

    $.fn[pluginName] = function(methodOrOptions){
        var someMethodArguments = arguments;
        return this.each(function () {
            if ( methods[methodOrOptions] ) {
                return methods[methodOrOptions].apply( this, Array.prototype.slice.call( someMethodArguments, 1 ));
            } else if ( typeof methodOrOptions === "object" || ! methodOrOptions ) {
                // Default to "init"
                $.data(this, "plugin_" + pluginName, new Plugin( this, methodOrOptions ));
            } else {
                $.error( "Method " +  methodOrOptions + " does not exist on jQuery." + pluginName );
            }
        });
    };

})(jQuery, window, document);
