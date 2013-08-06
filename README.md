lattice
=======

A jQuery plugin that creates 2-dimensional HTML grid slider from cell elements in a container.

#Demos

- [Main testing area|http://chateloin.com/dev/lattice/]: This is what I'm using to work on the plugin. It'll be broken from time to time, sorry.

#Issues

Currently, it's a buggy work in progress. Performance is still being worked on. Features are still being implemented. Suggestions are highly welcome: mchateloin@gmail.com

#Upcoming Features

This is what I plan to implement before v1.0
- [ ] Better support for any width and height for cell elements. Currently it's assumed that all cells are the same width and height.
- [ ] Callback support on animation and navigation
- [ ] Create an actual full screen mode, not the "full window" functionality that's there currently, that I mistakenly _called_ 'fullscreen' mode, ha.
- [ ] Ability to activate fullscreen at runtime with an awesome transition
- [X] Thumbnail support through the data-thumbnail attribute (specifies CSS ID of an image)
- [X] Dynmaic thumbnails by including the dynamic 'self' tag [1]
- [ ] Refactor useful methods into a new pattern to allow invoking after initialization [2]
- [ ] Peformance mode for heavy web apps, where more information is provided about the DOM in intialization options, rather than having to traverse the the DOM for data-attributes.
- [ ] Ability to activate mouse, key, scroll, and swipe events for adjacent sliding.
- [ ] 3-D sliding with 3-D thumbnail map. The additional data-depth attribute needs to be created along with new compass definitions, 'forward' and 'backward' and animation logic for those definitions. [3]
- [ ] Build awesome examples, both 2D and 3D versions, of the following: (1)A collection of cue card like HTML elements, and (2) an image gallery, and (3) a simple sample personal website.
- [ ] Ability to create thumbnails from sprited image.

_**[1]** Using [html2canvas](https://github.com/niklasvh/html2canvas) is difficult. A canvas can only be created from visible elements (i.e. display not set to 'none' or visibility not set to 'hidden'). My crude attempt to programmatically display each cell element and then capture it with html2canvas failed. Either I'm doing something wrong or there's no way to gaurantee that I can capture a visible element after using $.css(). I choose to believe the former and continue trying at this. Not out of ideas yet!_

_**[2]** Currently considering [this pattern](http://stackoverflow.com/questions/1117086/how-to-create-a-jquery-plugin-with-methods#answer-1117129). Some current candidates are activateFullscreen, slideOn, hideThumbnailMap, showThumbnailMap, and more._

_**[3]**  Very ambitious. This is **the** epic feature. I know how to implement it, but performance has to be **solid** before I take it on. Lots refactoring will happen, but it's all worth it!_

#Contact

Miguel Chateloin

mchateloin@gmail.com