/*
 Train  layout designer / maker

Author : François Crevola - francois(AT)crevola(DOT)org
Source repository :  https://github.com/Krevo/geotrain

1. This software include the "Clipper Library" under the Boost Software Licence
(see clipper.js)

2. This software is licensed under BSD Licence :

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

 var u = 100; // Base unit for calculating pieces coordinates
 var ur = 15; // Current number of pixels for a square / grid width and height
// ratio = 15/100 = 0,15

 var ur_min = 2;
 var ur_max = 35;

 var NE = 1;
 var SE = 2;
 var SO = 3;
 var NO = 4;

 var H = 1;
 var V = 2;

 // These 2 variables are used to move the map by (globaldx * ur) for x coordinates and (globaldy * ur) for y coordinates
 var globaldx = 0;
 var globaldy = 0;

var mousePos;

var selecting = false; // Flag for currently selecting pieces for merge

var showRefPoint = false;
var showPath = false;
var showGrid = true
var usePaint = false;
var circuit = 1;
var canvas;
var ctx;
var drag = true;
var infinite = true;
var dragOrientation = 1;
var indexPieces = 0;
var moveIntervalId = -1;

var moveUpArea;
var moveDownArea;
var moveLeftArea;
var moveRightArea;

var isInMoveUpArea = false;
var isInMoveDownArea = false;
var isInMoveLeftArea = false;
var isInMoveRightArea = false;

var pieces = new Array();

var map = new Array();

 function init() {

  canvas = document.getElementById("geocanvasfg");
  bgcanvas = document.getElementById("geocanvasbg");
  mapcanvas = document.getElementById("geocanvas");

  commandPanel = document.getElementById("geocommand");

  // type of event : mouseup, mousemove, mousedown, click,
  canvas.addEventListener("mousemove", ev_mousemove, false);

  // I want to follow start and end of selecting pieces, for a merge
  canvas.addEventListener("mousedown", ev_mousedown, false);
  canvas.addEventListener("mouseup", ev_mouseup, false);
  canvas.addEventListener("mouseout", ev_mouseout, false);

  // IE9, Chrome, Safari, Opera
  canvas.addEventListener("mousewheel", MouseWheelHandler, false);
  // Firefox
  canvas.addEventListener("DOMMouseScroll", MouseWheelHandler, false);

  canvas.addEventListener("click", ev_mouseclick, false);
  if (window.addEventListener){
    window.addEventListener("keydown", ev_keypress, false);
  } else if (window.attachEvent){ // IE sucks !
    window.attachEvent("keydown", ev_keypress, false);
  }

  ctx = canvas.getContext("2d");
  gridCtx = bgcanvas.getContext("2d");
  mapCtx = mapcanvas.getContext("2d");

  ctx.canvas.width  = window.innerWidth * 0.8;
  ctx.canvas.height = window.innerHeight * 0.87;

  gridCtx.canvas.width  = window.innerWidth * 0.8;
  gridCtx.canvas.height = window.innerHeight * 0.87;

  mapCtx.canvas.width  = window.innerWidth * 0.8;
  mapCtx.canvas.height = window.innerHeight * 0.87;

  panel = commandPanel.getContext("2d");

  panel.canvas.width  = window.innerWidth * 0.1;
  panel.canvas.height = window.innerHeight * 0.87;

  pieces.push(calculateRailCourbe("short"));
  pieces.push(calculateRailCourbe());
  pieces.push(calculateRailCourbe("long"));
  pieces.push(calculateRailCroix());
  pieces.push(calculateRailAiguillageD());
  pieces.push(calculateRailAiguillageG());
  pieces.push(calculateRailAiguillageT());
  pieces.push(calculateRailDroit());
  pieces.push(calculateRailDroitCourt());
  pieces.push(calculateRailSlice());
  pieces.push(calculateRailSliceR());
  pieces.push(calculateRailXSwitch());
  pieces.push(calculateRailSlice_Switch());
  pieces.push(calculateRailSliceR_Switch());

  l = Math.max(canvas.width*0.02,canvas.height*0.02);
  w = 25;

  moveUpArea = [0,0,canvas.width,w];
  moveDownArea = [0,canvas.height-w,canvas.width,canvas.height];
  moveLeftArea = [0,0,w,canvas.height];
  moveRightArea = [canvas.width-w,0,canvas.width,canvas.height];

  _loadCircuit1();
  redrawAll();
}

function findPieceIndexByName(name) {

   for (var i=0; i<pieces.length; i++) {
      if (pieces[i].name==name) { // On a trouvé la piece demandée
        return i;
      }
   }

}

function renderPiece(ctx,x,y,name,orientation) {

    i = findPieceIndexByName(name);
    if (i!=-1) {
      pieceToRender = pieces[i];
      while (orientation > pieceToRender.points.length) { // orientation can go from 1 to 4 but some tracks have only 2 orientations (straigth tracks), and even only 1  (cross track)
        orientation--; // = Math.round(orientation/pieceToRender.points.length);
      }
      pointsToRenderTab = pieceToRender.points[orientation-1].drawPoints;
      drawPoints(ctx,x,y,pointsToRenderTab,"Black");

      pathsToRenderTab = pieceToRender.points[orientation-1].paths;

      drawNewPath(ctx,x,y,pieceToRender.points[orientation-1]);
      drawRefPoint(ctx,x,y);
   }
}

  function getMousePosition(ev) {
    var mouseX;
    var mouseY;
    if (ev.pageX || ev.pageY) {
      mouseX = ev.pageX;
      mouseY = ev.pageY;
    } else {
      mouseX = ev.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      mouseY = ev.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    //At this point, we have x and y coordinates that are relative to the document (that is, the entire HTML page). That’s not quite useful yet. We want coordinates relative to the canvas.
    mouseX -= canvas.offsetLeft;
    mouseY -= canvas.offsetTop;
    return {
      x : mouseX,
      y : mouseY
    }
  }

function ev_mouseup(ev) {

  if (drag) { return; } // We are dragging a track, thus we are not currently selecting (several) tracks for a merge
  mousePos = getMousePosition(ev);
  console.log("MOUSE UP AT x = "+mousePos.x+" Y = "+mousePos.y);
  selecting = false; // Fin du mode selection
  redrawForeground();
}

function ev_mousedown(ev) {

  if (drag) { return; }  // We are dragging a track, thus we are not currently selecting (several) tracks for a merge
  mousePos = getMousePosition(ev);
  console.log("MOUSE DOWN AT x = "+mousePos.x+" Y = "+mousePos.y);
  startSelectingX = mousePos.x;
  startSelectingY = mousePos.y;
  selecting = true; // We are now on mode "cirrently selecting"
}

// An area is defined by area[0],area[1] (upper left point) and area[2],area[3] (lower right point)
function inArea(x,y,area) {
  return (x>area[0] && x<area[2] && y>area[1] && y<area[3]);
}

function startMoving() {
  if (moveIntervalId<=0) {
    moveIntervalId = setInterval(moveMap, 100);
  }
}

function stopMoving() {
  if (moveIntervalId > 0) {
    clearInterval(moveIntervalId)
  };
  moveIntervalId = -1;
}

// Mouse is out of the canvas
function ev_mouseout(ev) {
  stopMoving(); // If currently moving the map we stop !
}


function ev_mousemove(ev) {

  mousePos = getMousePosition(ev);

  isInMoveUpArea = inArea(mousePos.x,mousePos.y,moveUpArea);
  isInMoveDownArea = inArea(mousePos.x,mousePos.y,moveDownArea);
  isInMoveLeftArea = inArea(mousePos.x,mousePos.y,moveLeftArea);
  isInMoveRightArea = inArea(mousePos.x,mousePos.y,moveRightArea);

  if (isInMoveUpArea || isInMoveDownArea || isInMoveLeftArea || isInMoveRightArea) {
    startMoving();
  } else {
    stopMoving();
  }

  redrawForeground();

  if (selecting) {
    ctx.strokeStyle = "Red";
    ctx.strokeRect(startSelectingX,startSelectingY,mousePos.x-startSelectingX,mousePos.y-startSelectingY);
  }

}

function exportMap() {
  xml = '';
  xml = xml + '<?xml version="1.0" encoding="UTF-8"?>'+'\n';
  xml = xml + '<layout>'+'\n';
  for (var j=0; j<map.length; j++) {
    xml = xml + '  <piece>'+'\n';
    xml = xml + '    <name>'+map[j][2]+'</name>'+'\n';
    xml = xml + '    <x>'+map[j][0]+'</x>'+'\n';
    xml = xml + '    <y>'+map[j][1]+'</y>'+'\n';
    xml = xml + '    <orientation>'+map[j][3]+'</orientation>'+'\n';
    xml = xml + '  </piece>'+'\n';
  }
  xml = xml + "</layout>"+'\n';
  console.log(xml);
}

function moveMap() {

  if (isInMoveUpArea)    { globaldy++; };
  if (isInMoveDownArea)  { globaldy--; };
  if (isInMoveLeftArea)  { globaldx++; };
  if (isInMoveRightArea) { globaldx--; };

  redrawMap();
  return;
}

function ev_mouseclick(ev) {

  if (drag) { // case "drop of a piece"
    map.push([mousePos.x/ur-globaldx, mousePos.y/ur-globaldy, pieces[indexPieces].name, dragOrientation]);
    if (!infinite) { drag = false; }
    redrawMap();
    redrawForeground();
  } else if (Math.abs(startSelectingX-mousePos.x)>5 || Math.abs(startSelectingY-mousePos.y)>5) {  // case "end of selecting"
    // if distance from muse down event is "big", that mean we have drawn a selecting rectangle, thus we are not trying to pull a piece out of the layout

    // Looking for all pieces included in the selecting rectangle
    var maxX = Math.max(mousePos.x,startSelectingX);
    var minX = Math.min(mousePos.x,startSelectingX);
    var maxY = Math.max(mousePos.y,startSelectingY);
    var minY = Math.min(mousePos.y,startSelectingY);
    var piecesAfusionner = [];
    for (var j=0; j<map.length; j++) {
        console.log("j = "+j);
        mapX = map[j][0];
        mapY = map[j][1];
        if (inArea((mapX+globaldx)*ur,(mapY+globaldy)*ur,[minX,minY,maxX,maxY])) {
          console.log("piece selectionnée => ");
          console.log(map[j]);
          piecesAfusionner.push(map[j]);
        }
    }
    console.log(piecesAfusionner);
    // Now, we can merge all pieces that have been found. They are in the array 'piecesAfusionner', knowing that pieceAfusionner[i] = [x,y,name,orientation]
    fusionne(piecesAfusionner);

    return;
  } else { // case : take a piece (eventually) out of the layout

    // Find the nearest piece from mousePos.x, mousePos.y
    posX = Math.round(mousePos.x/ur)-globaldx;
    posY = Math.round(mousePos.y/ur)-globaldy;
    distMin = 99999;
    for (var j=0; j<map.length; j++) {
        mapX = map[j][0];
        mapY = map[j][1];
        dist = Math.sqrt(Math.pow(posX-mapX,2)+Math.pow(posY-mapY,2));
        if (dist<distMin) {
          distMin = dist;
          indexPiecePlusProche = j;
        }
    }
    if (distMin < 5) {
      dragOrientation = map[indexPiecePlusProche][3];
      indexPieces = findPieceIndexByName(map[indexPiecePlusProche][2]);
      map.splice(indexPiecePlusProche,1);
      drag = true;
      redrawMap();
      redrawForeground();
    }
  }

}

function MouseWheelHandler(e) {
  // cross-browser wheel delta
  var e = window.event || e; // old IE support
  var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
  console.log("delta = "+delta);
  if (delta>0) {
    updateUr(1);
  } else {
    updateUr(-1);
  }
  redrawAll();
}

function updateUr(incr) {
  ur_previous = ur;
  ur+=incr;
  if (ur<ur_min) { ur = ur_min; }
  if (ur>ur_max) { ur = ur_max; }

  // Now, we need to calculate a modification of globaldx and globaldy in order to "center" the map
  nbCasesx = canvas.width/ur;
  nbCasesx_old = canvas.width/ur_previous;
  globaldx -= Math.round((nbCasesx_old - nbCasesx)/2);

  nbCasesy = canvas.height/ur;
  nbCasesy_old = canvas.height/ur_previous;
  globaldy -= Math.round((nbCasesy_old - nbCasesy)/2);
}

function ev_keypress(e) {
  var redraw = false;
  keyCode = e.keyCode

  if (keyCode==107) { updateUr(1); redrawGrid(); redraw=true; } // +  Zoom in
  if (keyCode==109) { updateUr(-1); redrawGrid(); redraw=true; } // - Zoom out

  if (keyCode==88) { exportMap(); } // 88 => X - Export map to Xml ...

  if (keyCode==71) { showGrid = !showGrid; redrawGrid(); } // 71 => G
  if (keyCode==82) { redraw = true; showRefPoint = !showRefPoint; }   // 82 => R
  if (keyCode==80) { redraw = true; showPath = !showPath; } // 80 => P

  if (keyCode==81) { redraw = true; usePaint = !usePaint; } // 81 => Q
  if (keyCode==68 || (keyCode==46 && drag)) { redraw = true; drag = !drag; infinite = drag; } // 68 => D
  if (keyCode==48) { redraw = true; _loadCircuit0(); } // 0 => Circuit 0
  if (keyCode==49) { redraw = true; _loadCircuit1(); } // 1 => Circuit 1
  if (keyCode==50) { redraw = true; _loadCircuit2(); } // 2 => Circuit 2

  if (keyCode==38) { redraw = true; dragOrientation++; } // UP
  if (keyCode==40) { redraw = true; dragOrientation--; } // DOWN
  if (keyCode==37) { redraw = true; indexPieces++; dragOrientation=1; } // LEFT
  if (keyCode==39) { redraw = true; indexPieces--; dragOrientation=1; } // RIGHT

  if (keyCode==67) { redraw = true; map = new Array(); } // Clear the current layout
  if (keyCode==90) { redraw = true; map.pop(); } // Z => Undo

  if (indexPieces>=pieces.length) indexPieces = 0;
  if (indexPieces<0) indexPieces = pieces.length-1;

  if (dragOrientation>pieces[indexPieces].points.length) dragOrientation=1;
  if (dragOrientation<1) dragOrientation=pieces[indexPieces].points.length;
  if (redraw) { redrawAll(); }
}

function redrawAll() {
  // we have 3 context to redraw
  redrawGrid(); // background
  redrawMap(); // current layout
  redrawForeground(); // move gadget + current dragged piece
}

function redrawMap() {

  mapCtx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the current layout
  for (var j=0; j<map.length; j++) {
   renderPiece(mapCtx,(map[j][0]+globaldx)*ur,(map[j][1]+globaldy)*ur,map[j][2],map[j][3]);
  }
}

function redrawForeground() {

  // We may clear a smaller area.. the one concerned by piece's old position
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the piece that is under the mouse pointer
  if (drag && typeof(mousePos)!='undefined') {
   renderPiece(ctx, mousePos.x, mousePos.y, pieces[indexPieces].name, dragOrientation);
  }

  var l = Math.max(canvas.width*0.02,canvas.height*0.02);
  var w = 20;

  // Arrow up

  if (isInMoveUpArea) {
    ctx.fillStyle = "DarkGrey";
  } else {
    ctx.fillStyle = "LightGrey";
  }

  ctx.beginPath();
  ctx.moveTo(canvas.width/2 - l, w);
  ctx.lineTo(canvas.width/2, 0);
  ctx.lineTo(canvas.width/2 + l, w);
  ctx.fill();

  // Arrow down

  if (isInMoveDownArea) {
    ctx.fillStyle = "DarkGrey";
  } else {
    ctx.fillStyle = "LightGrey";
  }

  ctx.beginPath();
  ctx.moveTo(canvas.width/2 - l, canvas.height-w);
  ctx.lineTo(canvas.width/2, canvas.height);
  ctx.lineTo(canvas.width/2 + l, canvas.height-w);
  ctx.fill();

  // Arrow left

  if (isInMoveLeftArea) {
    ctx.fillStyle = "DarkGrey";
  } else {
    ctx.fillStyle = "LightGrey";
  }

  ctx.beginPath();
  ctx.moveTo(w, canvas.height/2 - l);
  ctx.lineTo(0, canvas.height/2);
  ctx.lineTo(w, canvas.height/2 + l);
  ctx.fill();

  // Arrow right

  if (isInMoveRightArea) {
    ctx.fillStyle = "DarkGrey";
  } else {
    ctx.fillStyle = "LightGrey";
  }

  ctx.beginPath();
  ctx.moveTo(canvas.width-w, canvas.height/2 - l);
  ctx.lineTo(canvas.width, canvas.height/2);
  ctx.lineTo(canvas.width-w, canvas.height/2 + l);
  ctx.fill();

}

function loadPieceData(nodeElem) {
    var childElem;

    // Processing element's children
    for (var i=0; i<nodeElem.childNodes.length; i++) {
      childElem = nodeElem.childNodes[i];
      if (childElem.nodeType==1) { // 1 = ELEMENT_NODE
        //console.log(childElem.nodeName);
        if (childElem.nodeName=='x') {
           x = readInt(childElem);
        } else if (childElem.nodeName=='y') {
           y = readInt(childElem);
        } else if (childElem.nodeName=='orientation') {
           orientation = readInt(childElem);
        } else if (childElem.nodeName=='name') {
           name = readString(childElem);
        }
      }
    }
    return new Array(x,y,name,orientation);
}

function readString(item) {
  if (item.childNodes[0]==null) {
    return "";
  }
  return item.childNodes[0].nodeValue;
}

function readInt(item) {
  if (item.childNodes[0]==null) {
    return "";
  }
  return parseInt(item.childNodes[0].nodeValue);
}

function _loadCircuit(filename) {

    map = new Array();
    var xmlDoc = loadXMLDoc(filename);
    if (!xmlDoc) return;
    var nodeElem;
    for (var i=0; i<xmlDoc.documentElement.childNodes.length; i++) {
      nodeElem = xmlDoc.documentElement.childNodes[i];
      if (nodeElem.nodeType==Node.ELEMENT_NODE) {
        //console.log(xmlDoc.documentElement.childNodes[i].nodeName);
        if (nodeElem.nodeName=='piece') {
           map.push(loadPieceData(nodeElem));
        }
      }
    }
}

function _loadCircuit0() {
  _loadCircuit("geotrax_layout0.xml");
}

function _loadCircuit1() {
  _loadCircuit("geotrax_layout1.xml");
}

function _loadCircuit2() {

    map = new Array();
    map.push(new Array(28,6,"RAIL_DROIT",H));
    map.push(new Array(36,10,"LONG_CURVE",NE));
    map.push(new Array(20,10,"LONG_CURVE",NO));

    map.push(new Array(9,20,"CURVE",NO));
    map.push(new Array(16,18,"CROSSING",1));
    map.push(new Array(22,18,"RAIL_DROIT",H));
    map.push(new Array(28,18,"RAIL_DROIT",H));
    map.push(new Array(34,18,"RAIL_DROIT",H));
    map.push(new Array(40,18,"CROSSING",1));
    map.push(new Array(47,20,"CURVE",NE));

    map.push(new Array(7,27,"RAIL_DROIT",V));
    map.push(new Array(7,33,"RAIL_DROIT",V));
    map.push(new Array(11,41,"LONG_CURVE",SO));

    map.push(new Array(40,23,"RAIL_DROIT_COURT",V));
    map.push(new Array(40,27,"RAIL_DROIT",V));
    map.push(new Array(40,33,"CROSSING",1));
    map.push(new Array(40,39,"RAIL_DROIT",V));
    map.push(new Array(40,44,"RAIL_DROIT_COURT",V));

    map.push(new Array(38,49,"CURVE",SE));
    map.push(new Array(30,49,"CURVE",SO));
    map.push(new Array(26,43,"AIGUILLAGE_D",SE));
    map.push(new Array(30,35,"AIGUILLAGE_D",NO));

    map.push(new Array(19,45,"RAIL_DROIT",H));
    map.push(new Array(35,33,"RAIL_DROIT_COURT",H));

    map.push(new Array(49,26,"RAIL_DROIT_COURT",V));
    map.push(new Array(47,31,"CURVE",SE));

    map.push(new Array(26,29,"CURVE",NE));
    map.push(new Array(18,25,"CURVE",SO));

}

function _showGrid(show) {
  if (show) {
    ctx.beginPath();
    ctx.strokeStyle = "LightGrey";
    max  = Math.max(canvas.width,canvas.height);
    for (var i=0; i<(max/ur); i++) {
      ctx.moveTo(i*ur,0);  ctx.lineTo(i*ur,canvas.height); // Vertical line
      ctx.moveTo(0,i*ur);  ctx.lineTo(canvas.width,i*ur); // Horizontal line
    }
    ctx.stroke();
  }
}

function redrawGrid() {
  // Clear the canvas
  gridCtx.clearRect(0, 0, bgcanvas.width, bgcanvas.height);
  // Draw grid if a grid has to be drawn
  if (showGrid) {
    gridCtx.beginPath();
    gridCtx.strokeStyle = "LightGrey";
    max  = Math.max(bgcanvas.width,bgcanvas.height);
    for (var i=0; i<(max/ur); i++) {
      gridCtx.moveTo(i*ur,0);  gridCtx.lineTo(i*ur,canvas.height); // Ligne V
      gridCtx.moveTo(0,i*ur);  gridCtx.lineTo(bgcanvas.width,i*ur); // Ligne H
    }
    gridCtx.stroke();
  }
}

function calculateRailCourbe(arg) {

  name = "CURVE";
  tab = new Array();

  var rayonInt = 5*u;
  var rayonExt = 7*u;

  if (arg=="long") {
    name = "LONG_CURVE";
    rayonInt = 8*u;
    rayonExt = 10*u;
  } else if (arg=="short") {
    name = "SHORT_CURVE";
    rayonInt = 2*u;
    rayonExt = 4*u;
  }


  tab.push(_calculateRailCourbe(rayonInt,rayonExt,Math.PI*(3/2)));
  tab.push(_calculateRailCourbe(rayonInt,rayonExt,0));
  tab.push(_calculateRailCourbe(rayonInt,rayonExt,Math.PI/2));
  tab.push(_calculateRailCourbe(rayonInt,rayonExt,Math.PI));

  return {
    name: name,
    points: tab
  }
}

function calculateRailCroix() {

  name = "CROSSING";

  shortTrackH = _calculateRailDroitCourt(Math.PI/2); // horizontal short straight track
  shortTrackV = _calculateRailDroitCourt(0); // vertical short straight track

  current = fusionne2Pieces(shortTrackH,shortTrackV,2,2);
  current = fusionne2Pieces(current,shortTrackH,3,0);
  current = fusionne2Pieces(current,shortTrackV,2,-1);

  var polys = current.drawPoints;
  var addedPaths = current.paths;

  // Translating reference point (ie try to center the piece around coord 0,0)
  var dec = maxmin(addedPaths);
  for (var i=0; i<polys.length; i++) {
    translation(polys[i],dec.dx,dec.dy);
  }
  translation(addedPaths,dec.dx,dec.dy);

  var orient1 = makeOrientation(polys,addedPaths,0);

  return {
    name: name,
    points: [orient1]
  }

}

function calculateRailAiguillageD() {

  name = "AIGUILLAGE_D";

  courbe = _calculateRailCourbe(5*u,7*u,0); // curved track
  shortTrack = _calculateRailDroitCourt(0); // vertical short straight track

  current = fusionne2Pieces(courbe,shortTrack,2,-2);
  current = fusionne2Pieces(current,shortTrack,2,1);

  var polys = current.drawPoints;
  var addedPaths = current.paths;

  var orient1 = makeOrientation(polys,addedPaths,Math.PI*(3/2));
  var orient2 = makeOrientation(polys,addedPaths,0);
  var orient3 = makeOrientation(polys,addedPaths,Math.PI/2);
  var orient4 = makeOrientation(polys,addedPaths,Math.PI);

  return {
    name: name,
    points: [orient1, orient2, orient3, orient4]
  }

}

function calculateRailAiguillageG() {

  name = "AIGUILLAGE_G";
  tab = new Array();

  courbe = _calculateRailCourbe(5*u,7*u,0); // curved track
  shortTrack = _calculateRailDroitCourt(Math.PI/2); // vertical short straight track

  current = fusionne2Pieces(courbe,shortTrack,0,2);
  current = fusionne2Pieces(current,shortTrack,-3,2);

  var polys = current.drawPoints;
  var addedPaths = current.paths;

  var orient1 = makeOrientation(polys,addedPaths,Math.PI*(3/2));
  var orient2 = makeOrientation(polys,addedPaths,0);
  var orient3 = makeOrientation(polys,addedPaths,Math.PI/2);
  var orient4 = makeOrientation(polys,addedPaths,Math.PI);

  return {
    name: name,
    points: [orient1, orient2, orient3, orient4]
  }

}

function calculateRailAiguillageT() {

  name = "AIGUILLAGE_T";
  tab = new Array();

  courbe1 = _calculateRailCourbe(5*u,7*u,0);
  courbe2 = _calculateRailCourbe(5*u,7*u,Math.PI/2); // curved track
  shortTrack = _calculateRailDroitCourt(Math.PI/2); // vertical short straight track

  current = fusionne2Pieces(courbe1,courbe2,4,0);
  current = fusionne2Pieces(current,shortTrack,-3,2);
  current = fusionne2Pieces(current,shortTrack,0,2);
  current = fusionne2Pieces(current,shortTrack,3,2);
  current = fusionne2Pieces(current,shortTrack,6,2);

  var polys = current.drawPoints;
  var addedPaths = current.paths;

  // Translating reference point (ie try to center the piece around coord 0,0)
  dx = -2; dy = -2;
  for (var i=0; i<polys.length; i++) {
    translation(polys[i],dx,dy);
  }
  translation(addedPaths,dx,dy);

  var orient1 = makeOrientation(polys,addedPaths,Math.PI*(3/2));
  var orient2 = makeOrientation(polys,addedPaths,0);
  var orient3 = makeOrientation(polys,addedPaths,Math.PI/2);
  var orient4 = makeOrientation(polys,addedPaths,Math.PI);

  return {
    name: name,
    points: [orient1, orient2, orient3, orient4]
  }

  return {
    name: name,
    points: tab
  }
}

function calculateRailSlice() {

  name = "SLICE";
  tab = new Array();

  tab.push(_calculateRailSlice(0,false,false));
  tab.push(_calculateRailSlice(Math.PI/2,false,false));

  return {
    name: name,
    points: tab
  }
}

function calculateRailSliceR() {

  name = "RSLICE";
  tab = new Array();

  tab.push(_calculateRailSlice(0,true,false));
  tab.push(_calculateRailSlice(Math.PI/2,true,false));

  return {
    name: name,
    points: tab
  }
}

function calculateRailSlice_Switch() {

  name = "SLICE_SWITCH";

  obj1 = _calculateRailSlice(0,false,false);
  obj2 = _calculateRailDroitCourt(Math.PI/2);

  current = fusionne2Pieces(obj1,obj2,2,1);
  current = fusionne2Pieces(current,obj2,-4,1);
  current = fusionne2Pieces(current,obj2,-1,1);

  var polys = current.drawPoints;
  var addedPaths = current.paths;

  var orient1 = makeOrientation(polys,addedPaths,0);
  var orient2 = makeOrientation(polys,addedPaths,Math.PI/2);
  var orient3 = makeOrientation(polys,addedPaths,Math.PI);
  var orient4 = makeOrientation(polys,addedPaths,Math.PI*(3/2));


  return {
    name: name,
    points: [orient1, orient2, orient3, orient4]
  }

}

function calculateRailSliceR_Switch() {

  name = "RSLICE_SWITCH";

  obj1 = _calculateRailSlice(0,true,false);
  obj2 = _calculateRailDroitCourt(Math.PI/2);

  current = fusionne2Pieces(obj1,obj2,2,1);
  current = fusionne2Pieces(current,obj2,-4,1);
  current = fusionne2Pieces(current,obj2,-1,1);

  var polys = current.drawPoints;
  var addedPaths = current.paths;

  var orient1 = makeOrientation(polys,addedPaths,0);
  var orient2 = makeOrientation(polys,addedPaths,Math.PI/2);
  var orient3 = makeOrientation(polys,addedPaths,Math.PI);
  var orient4 = makeOrientation(polys,addedPaths,Math.PI*(3/2));


  return {
    name: name,
    points: [orient1, orient2, orient3, orient4]
  }

}

function calculateRailDroit() {

  name = "RAIL_DROIT";

  shortTrackH = _calculateRailDroitCourt(Math.PI/2); // horizontal short straight track

  current = fusionne2Pieces(shortTrackH,shortTrackH,3,0);

  var polys = current.drawPoints;
  var addedPaths = current.paths;

  // Translation du point de reference
  var dec = maxmin(addedPaths);
  for (var i=0; i<polys.length; i++) {
    translation(polys[i],dec.dx,dec.dy);
  }
  translation(addedPaths,dec.dx,dec.dy);

  var orient1 = makeOrientation(polys,addedPaths,0);
  var orient2 = makeOrientation(polys,addedPaths, Math.PI/6);
  var orient3 = makeOrientation(polys,addedPaths,Math.PI/4);
  var orient4 = makeOrientation(polys,addedPaths, Math.PI/3);
  var orient5 = makeOrientation(polys,addedPaths,Math.PI/2);
  var orient6 = makeOrientation(polys,addedPaths, -Math.PI/3);
  var orient7 = makeOrientation(polys,addedPaths, -Math.PI/4);
  var orient8 = makeOrientation(polys,addedPaths, -Math.PI/6);

  return {
    name: name,
    points: [orient1, orient2, orient3, orient4, orient5, orient6, orient7, orient8]
  }

}

function calculateRailDroitCourt() {

  name = "RAIL_DROIT_COURT";
  tab = new Array();

  tab.push(_calculateRailDroitCourt(Math.PI/2));
  tab.push(_calculateRailDroitCourt(0));

  return {
    name: name,
    points: tab
  }
}

function _calculateRailDroitCourt(angle) {

  var points = new Array();

  points.push(new Array(-u,-2*u));
  points.push(new Array(u,-2*u));
  points.push(new Array(u,1*u));
  points.push(new Array(-u,1*u));
  points.push(new Array(-u,-2*u));   // Back to the first point

  rotation(points,angle);

  var pointsPath = new Array();
  // Generate path, with an intermediate point for u pixels (1 square of the grid)
  for (var i=-2; i<1; i++) {
    pointsPath.push(new Array(0,i*u,0,(i+1)*u));
  }
  rotation(pointsPath,angle);
  arrondi(pointsPath);

  return {
    drawPoints : new Array(points),
    paths : pointsPath
  }

}

/*
  The piece is calculated by union of two others ("Rail Slice" + "Rail Slice reverse")
    _    _       _ _
  _/   +  \_  =  _X_

  union of polygons is done using the clipper library (clipper.js)
*/

function calculateRailXSwitch() {

  name = "XSWITCH";

  obj1 = _calculateRailSlice(0,false,false);
  obj2 = _calculateRailSlice(0,true,false); // Same piece reversed/mirrored

  current = fusionne2Pieces(obj1,obj2,0,0);

  var polys = current.drawPoints;
  var addedPaths = current.paths;

  var orient1 = makeOrientation(polys,addedPaths,0);
  var orient2 = makeOrientation(polys,addedPaths,Math.PI/2);

  return {
    name: name,
    points: [orient1, orient2]
  }

}

function  fusionne(piecesAfusionner) {
  // we will merge the 2 first pieces from array 'piecesAfusionner'
  console.log(" ------------");
  console.log(piecesAfusionner);
  if (piecesAfusionner.length==0) return; // protection

  // 1. current = last piece to merge
  var lastPieceOnMap = piecesAfusionner[piecesAfusionner.length-1];
  var current = pieces[findPieceIndexByName(lastPieceOnMap[2])].points[lastPieceOnMap[3]-1];

  // 2. Loop to merge the last entry of the array with the current element
  for (var i=piecesAfusionner.length-1; i>0; i--) {
    var pieceOnMap1 = piecesAfusionner[i-1];
    var pieceOnMap2 = piecesAfusionner[i];
    // 1. Compute deltax and deltay from 2nd element de la 2e compared to the 1st
    var dx = pieceOnMap2[0]-pieceOnMap1[0];
    var dy = pieceOnMap2[1]-pieceOnMap1[1];
    // Find the piece by name (given by pieceOnMapx[2]) in the list of available piece, and then get the correct piece orientation (given by pieceOnMapx[3])
    var piece = pieces[findPieceIndexByName(pieceOnMap1[2])].points[pieceOnMap1[3]-1];
    current = fusionne2Pieces(piece,current,dx,dy); // To do for all pieces... current = (current + piece)
  }

  // 'current' is the result of (piece1 + piece2 + .... + pieceN)
  var polys = current.drawPoints;
  var addedPaths = current.paths;

  // Translating reference point (ie try to center the piece around coord 0,0)
  var dec = maxmin(addedPaths);
  for (var i=0; i<polys.length; i++) {
    translation(polys[i],dec.dx,dec.dy);
  }
  translation(addedPaths,dec.dx,dec.dy);

  var orient1 = makeOrientation(polys,addedPaths,0);
  // Now, we have to calculate, rotation for 3 other angle.
  var orient2 = makeOrientation(polys,addedPaths,Math.PI/2);
  var orient3 = makeOrientation(polys,addedPaths,Math.PI);
  var orient4 = makeOrientation(polys,addedPaths,Math.PI*1.5);

  var newPiece = {
    name: "YOUFOU"+Math.floor((Math.random()*1000)+1), // Generate a random name for the new piece
    points: [orient1, orient2, orient3, orient4]
  }

  //console.log(newPiece);
  pieces.push(newPiece); // Add to global array of existing tracks !!!!!

  // Remove pieces ....
  for (var i=0; i<piecesAfusionner.length; i++) {
      var pieceToDeleteIndex = -1
      for (var j=0; j<map.length; j++) {
        if (map[j][0]==piecesAfusionner[i][0] // x
          && map[j][1]==piecesAfusionner[i][1] // y
          && map[j][2]==piecesAfusionner[i][2] // name
          && map[j][3]==piecesAfusionner[i][3]) { // orientation
            pieceToDeleteIndex = j;
          }
      }
      if (pieceToDeleteIndex!=-1) {
        map.splice(pieceToDeleteIndex,1);
      }
  }

  // ... and replace by the new piece (that is the union of all selected pieces)
  map.push([piecesAfusionner[0][0]-dec.dx,piecesAfusionner[0][1]-dec.dy,newPiece.name,1]);

  // Redraw
  redrawMap();

}

function fusionne2Pieces(piece1,piece2,dx,dy) {

  var pts1 = arrayCopy(piece1.drawPoints);
  var pts2 = arrayCopy(piece2.drawPoints); //   /!\ drawPoints is an array of array of points, i.e it can be several shapes
  // Translate piece2 by dx and dy (so that reference point is at the same point)
  for (var i=0; i<pts2.length; i++) {
    translation(pts2[i],dx,dy);
  }

  // Ok, now with have to make the union of shape piece1 (piece1.drawPoints) with shape piece2 (piece2.drawPoints)
  subj_polygons = scale(geotrain2clipper(pts1),100);
  clip_polygons = scale(geotrain2clipper(pts2),100);

  cpr = new ClipperLib.Clipper();
  cpr.AddPolygons(subj_polygons, ClipperLib.PolyType.ptSubject);
  cpr.AddPolygons(clip_polygons, ClipperLib.PolyType.ptClip);

  // Available clip type are : ctUnion, ctIntersection, ctXor, ctDifference
  clipType = ClipperLib.ClipType.ctUnion;

  subject_fillType = ClipperLib.PolyFillType.pftNonZero;
  clip_fillType = ClipperLib.PolyFillType.pftNonZero;

  solution_polygons = [[]];
  succeeded = cpr.Execute(clipType, solution_polygons, subject_fillType, clip_fillType);

  solution_polygons = scale(solution_polygons,0.01);

  polys = clipper2geotrain(solution_polygons); // result may be one or more polygons ....

  for (var i=0; i<polys.length; i++) {
    polys[i].push(arrayCopy(polys[i][0])); // Last point must be a copy of the first point (if we don't make a copy, it is a reference to the same object which caused a bug when translating ..)
  }

  // don't forget to also "add" the path from piece1 (piece1.path) and piece2 (piece2.path)
  var paths1 = arrayCopy(piece1.paths);
  var paths2 = arrayCopy(piece2.paths);
  // All paths from piece2 must also be translated by dx and dy
  translation(paths2,dx,dy);

  // Merge paths
  var addedPaths = [];
  arrayMerge(addedPaths,paths1);
  arrayMerge(addedPaths,paths2);

  return {
    drawPoints : polys,
    paths : addedPaths
  }

}

function isPointInsideSegment(ptX, ptY, lineStartX, lineStartY, lineEndX, lineEndY) {
  var coefPartA = (ptY - lineStartY)  * (lineEndX - lineStartX);
  var coefPartB = (lineEndY - lineStartY) * (ptX - lineStartX);

  // Horizontal segment
  if (lineStartY == lineEndY) {
    if (ptY == lineStartY && ((ptX > lineStartX && ptX < lineEndX) || (ptX > lineEndX && ptX < lineStartX))) {
      return true;
    } else {
      return false;
    }
  }

  // Vertical segment
  if (lineStartX == lineEndX) {
    if (ptX == lineStartX && ((ptY > lineStartY && ptY < lineEndY) || (ptY > lineEndY && ptY < lineStartY))) {
      return true;
    } else {
      return false;
    }
  }

  if (coefPartA == coefPartB) return true;
}

function intersectionSegmentEtPiece(drawPoints, ptX, ptY) {

  arrondi(drawPoints);
  var pt = [ptX, ptY];
  arrondi(pt);

  for(var i =0; i<drawPoints.length; i++) {
    for(var j = 0; j< drawPoints[i].length-1; j++) {
      var pt1 = drawPoints[i][j];
      var pt2 = drawPoints[i][j+1];
      var res = isPointInsideSegment(pt[0], pt[1], pt1[0], pt1[1], pt2[0], pt2[1]);
      if (res) return true;
    }
  }
  return false;
}

// Adding path's segments
function arrayMerge(finalTab,tab) {
  for (var i=0; i<tab.length; i++) {
    var found = false;
    for (var j=0; j<finalTab.length; j++) {
      if (tab[i][0]==finalTab[j][0] && tab[i][1]==finalTab[j][1] && tab[i][2]==finalTab[j][2] && tab[i][3]==finalTab[j][3]) {
        found = true;
      }
      if (tab[i][0]==finalTab[j][2] && tab[i][1]==finalTab[j][3] && tab[i][2]==finalTab[j][0] && tab[i][3]==finalTab[j][1]) {
        found = true;
      }
    }
    // If we couldn't find identical segment, we simply add the current segment
    if (!found) {
      finalTab.push(tab[i]);
    }
  }
}

function maxmin(paths) {
  var maxX = 0;
  var maxY = 0;
  var minX = 0;
  var minY = 0;

    for (var j=0; j< paths.length; j++) { // For each segment in the current path...
      var seg = paths[j];

      // 1st point of segment
      if (seg[0]<minX) { minX = seg[0] } // lowest x coord is found !
      if (seg[0]>maxX) { maxX = seg[0] } // highest x coord is found !
      if (seg[1]<minY) { minY = seg[1] } // lowest y coord is found !
      if (seg[1]>maxY) { maxY = seg[1] } // highest y coord is found !

      // 2nd point of segment
      if (seg[2]<minX) { minX = seg[2] } // lowest x coord is found !
      if (seg[2]>maxX) { maxX = seg[2] } // highest x coord is found !
      if (seg[3]<minY) { minY = seg[3] } // lowest y coord is found !
      if (seg[3]>maxY) { maxY = seg[3] } // highest y coord is found !
    }

  return {
    dx: -Math.round((maxX+minX)/2/u),
    dy: -Math.round((maxY+minY)/2/u)
  }
}

function makeOrientation(polys,path,angle) {
  var newPolys = arrayCopy(polys);
  var newPath = arrayCopy(path);
  if (angle!=0) {
    for (var i=0; i<newPolys.length; i++) {
      rotation(newPolys[i],angle);
    }
    rotation(newPath,angle);
  }
  return {
    drawPoints : newPolys,
    paths : newPath
  }
}

function _calculateRailSlice(angle,_reverse,_aiguillage) {

  // Compute points
  var points = new Array();
  var pointsPath = new Array();

  var radiusInt = 7*u;
  var radiusExt = 7.5*u;


  for (var i=-(Math.PI/2); i<=0; i=i+(Math.PI/2)/20) {
     xi = -4.5*u+Math.cos(i)*radiusExt;
     yi = 5*u+Math.sin(i)*radiusExt;
     if (xi <= 0) {
      points.push(new Array(xi,yi));
     }
  }


  for (var i=Math.PI; i>=Math.PI/2; i=i-(Math.PI/2)/20) {
     xi = 4.5*u+Math.cos(i)*radiusExt;
     yi = -7*u+Math.sin(i)*radiusExt;
     if (xi >= 0) {
      points.push(new Array(xi,yi));
     }
  }


    var N = points.length;

    // Avec la partie droite
    if (_aiguillage) {
      points.push(new Array(4.5*u,2.5*u));
      points.push(new Array(-4.5*u,2.5*u));
      points.push(new Array(-4.5*u,0.5*u));

      for (var i=4.5; i>-4.5; i--) {
        pointsPath.push(new Array(i*u,1.5*u,(i-1)*u,1.5*u));
      }
    }

    for (var i=N-1; i>=0; i--) { // Copy the upper curve but lower and in reversed order.
      yi = points[i][1]+2*u;
      xi = points[i][0];
      if (_aiguillage) {
        if (yi <= 0.5*u && y_old >0.5*u) {
          points.push(new Array(xi,0.5*u));
        }
        if (yi <= 0.5*u) {
          points.push(new Array(xi,yi));
        }
      } else {
        points.push(new Array(xi,yi));
      }
      //pointsPath.push(new Array(xi,points[i][1]+u));
      y_old = yi;
    }
    points.push(arrayCopy(points[0])); // Back to first point

  points.push(arrayCopy(points[0])); // Back to first point

  // Re-compute middle path
  for (var i = N-1; i>0; i--) {
    pointsPath.push(new Array(points[i][0],points[i][1]+u,points[i-1][0],points[i-1][1]+u));
  }
  //...

  if (_reverse) {
    reverse(points);
    reverse(pointsPath);
  }

  // Translating reference point (ie try to center the piece around coord 0,0)
  translation(points,-0.5,-0.5);
  translation(pointsPath,-0.5,-0.5);

  // Rotate points
  rotation(points,angle);
  rotation(pointsPath,angle);

  return {
    drawPoints : new Array(points),
    paths : pointsPath
  }

}

function _calculateRailCourbe(radiusInt,radiusExt,angle) {

  // Compute points
  var points = new Array();

  points.push(new Array(0,radiusInt));
  points.push(new Array(0,radiusExt));

  for (var i=(Math.PI/2); i>=0; i=i-(Math.PI/2)/15) {
     xi = Math.cos(i)*radiusExt;
     yi = Math.sin(i)*radiusExt;
     points.push(new Array(xi,yi));
  }

  points.push(new Array(radiusInt,0));

  for (var i=0; i<=(Math.PI/2); i=i+(Math.PI/2)/15) {
     xi = Math.cos(i)*radiusInt;
     yi = Math.sin(i)*radiusInt;
     points.push(new Array(xi,yi));
  }

  translation(points,-Math.round((radiusExt/u)/2),-Math.round((radiusExt/u)/2));
  rotation(points,angle);

  // Path
  var pointsPath = new Array();
  var radiusInter = radiusInt+(radiusExt-radiusInt)/2;

  for (var i=0; i<8; i++) {
     j = i * (Math.PI/2)/8;
     k = (i+1) * (Math.PI/2)/8;
     x1 = Math.cos(j)*radiusInter;
     y1 = Math.sin(j)*radiusInter;
     x2 = Math.cos(k)*radiusInter;
     y2 = Math.sin(k)*radiusInter;
     pointsPath.push(new Array(x1,y1,x2,y2));
  }

  // Translating reference point (ie try to center the piece around coord 0,0)
  translation(pointsPath,-Math.round((radiusExt/u)/2),-Math.round((radiusExt/u)/2));

  // Rotate points
  rotation(pointsPath,angle);

  arrondi(points);
  arrondi(pointsPath);

  return {
    drawPoints : new Array(points),
    paths : pointsPath
  }
}

// Toolbox : function to draw a shape on canvas from an array of array of points (x,y)
function drawPoints(ctx, x, y, pointsTab, color) {

  // Filling interior of the shape (coloring)
  console.log(pointsTab);
  if (usePaint && color!="Red") {
    ctx.beginPath();
    ctx.fillStyle = "rgb(224,194,102)";
    for (var j=0; j<pointsTab.length; j++) {
      points = pointsTab[j];
      ctx.moveTo(x+(points[0][0]*(ur/u)),y+(points[0][1]*(ur/u)));
      // Draw by connecting points ...
      for (var i=1; i<points.length; i++) {
        ctx.lineTo(x+(points[i][0]*(ur/u)),y+(points[i][1]*(ur/u)));
      }
    }
    ctx.fill();
  }

  // Shape
  ctx.beginPath();
  ctx.strokeStyle = color;
  for (var j=0; j<pointsTab.length; j++) {
    points = pointsTab[j];
    ctx.moveTo(x+(points[0][0]*(ur/u)),y+(points[0][1]*(ur/u)));
    // Draw by connecting points ...
    for (var i=1; i<points.length; i++) {
      ctx.lineTo(x+(points[i][0]*(ur/u)),y+(points[i][1]*(ur/u)));
    }
   ctx.closePath();
  }
  ctx.stroke();
}

function drawRefPoint(ctx,x,y) {
  if (showRefPoint) {
    ctx.beginPath();
    ctx.fillStyle = "Green";
    ctx.arc(x,y,2,0,Math.PI*2,true);
    ctx.fill();
  }
}

// Paths are an array of segments (segment = array of 4 points x0,y0,x1,y1);
function drawNewPath(ctx,x,y,piece) {

  var points = piece.paths;
  var r = 2;
  if (!showPath) {
    return;
  }

  // Start and end of segment are drawn in blue
  // points[j] is a segment (== [x1, y1, x2, y2])
  for (var j=0; j<points.length; j++) {

      ctx.beginPath();
      if (intersectionSegmentEtPiece(piece.drawPoints, points[j][0], points[j][1])) {
        ctx.fillStyle = "Green";
        r = 3;
      } else {
        ctx.fillStyle = "Blue";
        r = 2;
      }
      ctx.arc(x+(points[j][0]*(ur/u)),y+(points[j][1]*(ur/u)),r,0,2*Math.PI,true);
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      if (intersectionSegmentEtPiece(piece.drawPoints, points[j][2], points[j][3])) {
        ctx.fillStyle = "Green";
        r = 3;
      } else {
        ctx.fillStyle = "Blue";
        r =2;
      }
      ctx.arc(x+(points[j][2]*(ur/u)),y+(points[j][3]*(ur/u)),r,0,2*Math.PI,true);
      ctx.fill();
  }

  // Lines
  ctx.beginPath();
  ctx.strokeStyle = "red";
  for (var j=0; j<points.length; j++) {
    segment = points[j];
    ctx.moveTo(x+(segment[0]*(ur/u)),y+(segment[1]*(ur/u)));
    ctx.lineTo(x+(segment[2]*(ur/u)),y+(segment[3]*(ur/u)));
  }
  ctx.stroke();
}

function arrayCopy(tab) {
  var newTab = [];
  for (var i=0; i<tab.length; i++) {
    if (tab[i] instanceof Array) {
      newTab[i] = arrayCopy(tab[i]);
    } else {
      newTab[i] = tab[i];
    }
  }
  return newTab;
}

// Translate segments (x0,y0,x1,y1)
function translation(points,dx,dy) {
  // Translating reference point (ie try to center the piece around coord 0,0)
  for (var i=0; i<points.length; i++) {
    // 1st point of segment [x1,y1,..,..] or first and only point [x,y]
    points[i][0] = points[i][0]+dx*u;
    points[i][1] = points[i][1]+dy*u;
    // 2nd point of segment [..,..,x2,y2]
    if (points[i].length==4) {
      points[i][2] = points[i][2]+dx*u;
      points[i][3] = points[i][3]+dy*u;
    }
  }
}

function reverse(points) {
  // vertical symmetry
  for (var i=0; i<points.length; i++) {
    // 1st point of segment [x1,y1,..,..] or first and only point [x,y]
    points[i][0] = - points[i][0];
    points[i][1] = points[i][1];
    // 2nd point of segment [..,..,x2,y2]
    if (points[i].length==4) {
      points[i][2] = - points[i][2];
      points[i][3] = points[i][3];
    }
  }
}

function rotation(points,angle) {
// Rotation of points
  for (var i=0; i<points.length; i++) {
    // 1st point of segment [x1,y1,..,..] or first and only point [x,y]
    xr = points[i][0];
    yr = points[i][1];
    points[i][0] = xr*Math.cos(angle)-yr*Math.sin(angle);
    points[i][1] = xr*Math.sin(angle)+yr*Math.cos(angle);
    // 2nd point of segment [..,..,x2,y2]
    if (points[i].length==4) {
      xr = points[i][2];
      yr = points[i][3];
      points[i][2] = xr*Math.cos(angle)-yr*Math.sin(angle);
      points[i][3] = xr*Math.sin(angle)+yr*Math.cos(angle);
    }
  }
}

function arrondi(tab) {
  // Rounding
  for (var i=0; i<tab.length; i++) {
    if (tab[i] instanceof Array) {
      arrondi(tab[i]);
    } else {
      tab[i] = Math.round(tab[i]*100)/100;
    }
  }
}

// polys is an array of polygone
// A polygone is an array of array of points (array of 2 int)
// ex: [[[x1,y1],[x2,y2]], ...]  with 1 sub poly
function geotrain2clipper(polys) {
  var subj_polygons = [];
  for (var i=0; i<polys.length; i++) {
    subj_polygons[i] = [];
    for (var j=0; j<polys[i].length; j++) {
      subj_polygons[i][j] = {X:polys[i][j][0], Y: polys[i][j][1]};
    }
  }
  return subj_polygons;
}

function clipper2geotrain(poly) {
  var subj_polygons = [];
  for (var i=0; i<poly.length; i++) {
    subj_polygons[i] = [];
    for (var j=0; j<poly[i].length; j++) {
      subj_polygons[i][j] = [poly[i][j].X, poly[i][j].Y];
    }
    arrondi(subj_polygons[i]); // round to 2 decimal after floating points
  }
  return subj_polygons;
}

function scale(poly, scale) {
  var i, j;
  var newPoly = [];
  if (!scale) scale = 1;
  for(i = 0; i < poly.length; i++) {
    newPoly[i] = [];
    for(j = 0; j < poly[i].length; j++) {
        newPoly[i][j] = {X:poly[i][j].X * scale, Y:poly[i][j].Y * scale};
    }
  }
  return newPoly;
}

function reverseTab(points) {
  var pointsReversed = new Array();
  var n = points.length;
  for (var i=0; i<points.length; i++) {
    pointsReversed[n-1-i] = points[i];
  }
  return pointsReversed;
}


function loadXMLDoc(dname) {
  if (window.XMLHttpRequest) {
    xhttp=new XMLHttpRequest();
  } else {
    xhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
  xhttp.open("GET",dname,false);
  try {
    xhttp.send();
  } catch (e) {
    if (window.console) { // for IE !
      console.error("Could not load layout "+dname);
    }
    return null;
  }
  return xhttp.responseXML;
}
