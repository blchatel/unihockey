/**
 * unihockey.js
 * @author Bastien Chatelain
 */

// Console print flags
const MESSAGE = true;
const DEBUG = false;
const WARNING = true
const ERROR = true;

const EPSILON = 1;
const SVG_HEIGHT = "832px";
const SVG_WIDTH = "512px"
// 1m -> 32 pixels
const TO_PIXEL_FACTOR = 32;

const frameDuration = 1000;//15; //15ms
const speedFactorCorrection = 0.15;

const states = {
    isPlaying: false,
    currentFrameId: 0,
    controlledPlayer: {id:-1, x: 0, y: 0, r: 0.5, team: "red", number: "0"}
};

//
function init(level) {

    // Get the frames
    const frames = level.frames;

    const fieldSVG = d3.select("#mainRow").append("svg")
        .attr("height", SVG_HEIGHT)
        .attr("width", SVG_WIDTH)
        .on("mousemove", function() {
            const xy = d3.mouse(this);
            if (states.controlledPlayer.id >= 0){
                updateMouseVector(xy[0], xy[1]);
                updatePlayers(fieldSVG, [states.controlledPlayer], filterClass="controlled");
            }
        });

    const fieldG = fieldSVG.append("g");
    fieldG.append("image")
        .attr("xlink:href", "res/field.svg")
        .attr("x", "0")
        .attr("y", "0")
        .attr("height", 832)
        .attr("width", 512);

    //create basic circles
    const enteredData = fieldG.selectAll("circle")
        .data(frames[states.currentFrameId])
        .enter();
    enteredData.append("circle")
        .attr("cx", function(p, i) {return p.x*TO_PIXEL_FACTOR})
        .attr("cy", function(p, i) {return p.y*TO_PIXEL_FACTOR})
        .attr("r", function(p, i) {return p.id == -1 ? 0 : p.r*TO_PIXEL_FACTOR})
        .attr("fill", function(p, i) {return p.team})
        .attr("class", "bot");
    enteredData.append("text")
        .attr("x", function(p) {return p.x*TO_PIXEL_FACTOR})
        .attr("y", function(p) {return p.y*TO_PIXEL_FACTOR})
        .attr("text-anchor", "middle")
        .attr("class", "bot")
        .text(function(p) {return p.number});
    enteredData.exit().remove();

    fieldG.append("circle").attr("class", "controlled")
    fieldG.append("text").attr("class", "controlled")

    // Key event pressed
    $(document).keypress(function(event){
        const charCode = event.which;
        if(charCode >= 52 && charCode <= 57 && !states.isPlaying){ // 4, 5, 6, 7, 8, 9
            states.controlledPlayer = $.extend(true, {}, frames[states.currentFrameId][charCode - 50]);
            updatePlayers(fieldSVG, frames[states.currentFrameId])
            updatePlayers(fieldSVG, [states.controlledPlayer], filterClass="controlled", transitionDuration=0)
        }
        else if (charCode == 45 && !states.isPlaying) { // -
            prevFrame(fieldSVG, frames);
        }
        else if (charCode == 43 && !states.isPlaying) { // +
            nextFrame(fieldSVG, frames);
        }
        else if (charCode == 110 && !states.isPlaying) { // n
            addFrameHere(fieldSVG, frames);
        }
        else if (charCode == 114 && !states.isPlaying) { // r
            removeFrameHere(fieldSVG, frames);
        }
        else if (charCode == 112 && !states.isPlaying) { // p
            playNext(fieldSVG, frames, 0);
        }
        else if (charCode == 32 && !states.isPlaying) { // space
            const player = frames[states.currentFrameId][states.controlledPlayer.id];

            if(typeof player != "undefined"){
                player.x = states.controlledPlayer.x;
                player.y = states.controlledPlayer.y;
                states.controlledPlayer.id = -1;
                updatePlayers(fieldSVG, [states.controlledPlayer], filterClass="controlled")
                updatePlayers(fieldSVG, frames[states.currentFrameId], filterClass="bot", transitionDuration=0)
            }
        }
        else if(MESSAGE){ // all others
            console.log(charCode + ": " +String.fromCharCode(charCode));
        }
    });
}

//
function prevFrame(fieldSVG, frames){
    const newFrame = Math.max(0, states.currentFrameId-1);
    if(states.currentFrameId != newFrame){
        states.currentFrameId = newFrame;
        updatePlayers(fieldSVG, frames[newFrame])
    }
}

//
function nextFrame(fieldSVG, frames){
    const newFrame = Math.min(states.currentFrameId+1, frames.length-1);
    if(states.currentFrameId != newFrame){
        states.currentFrameId = newFrame;
        updatePlayers(fieldSVG, frames[newFrame])
    }
}

//
function addFrameHere(fieldSVG, frames){
    const currentElem = frames[states.currentFrameId];
    let newElem = $.extend(true, [], currentElem);
    frames.splice(states.currentFrameId+1, 0, newElem);
    states.controlledPlayer.id = -1;
    updatePlayers(fieldSVG, [states.controlledPlayer], filterClass="controlled")
    nextFrame(fieldSVG, frames)
}

function removeFrameHere(fieldSVG, frames){
    if(frames.length > 1){
        frames.splice(states.currentFrameId, 1);
        states.controlledPlayer.id = -1;
        const id = Math.min(states.currentFrameId, frames.length-1);
        states.currentFrameId = id;
        updatePlayers(fieldSVG, [states.controlledPlayer], filterClass="controlled")
        updatePlayers(fieldSVG, frames[id], filterClass="bot", transitionDuration=0)
    }
}

//
function playNext(fieldSVG, frames, frameId){
    let promise = updatePlayers(fieldSVG, frames[frameId]);
    if(frameId == 0){
        states.isPlaying = true;
        // TODO play annimation 3, 2, 1
    }
    const newFrame = Math.min(frameId+1, frames.length-1);
    promise.then(function() {
        if(newFrame > frameId)
            playNext(fieldSVG, frames, newFrame);
        else {
            updatePlayers(fieldSVG, frames[states.currentFrameId])
            states.isPlaying = false;
        }
    });
}

//
function updateMouseVector(x, y) {
    const vx = x - (states.controlledPlayer.x*TO_PIXEL_FACTOR);
    const vy = y - (states.controlledPlayer.y*TO_PIXEL_FACTOR);
    if(DEBUG)
        console.log("("+vx+","+vy+")");

    const norm = Math.sqrt(vx * vx + vy * vy);
    if(norm > EPSILON){
        states.controlledPlayer.x += (speedFactorCorrection * vx / TO_PIXEL_FACTOR);
        states.controlledPlayer.y += (speedFactorCorrection * vy / TO_PIXEL_FACTOR);
    }
}

//
function updatePlayers(fieldSVG, players, filterClass="bot", transitionDuration=frameDuration) {

    const id = states.controlledPlayer.id;
    const controlled = filterClass == "controlled";

    return new Promise((resolve, reject) => {

        const fieldG = fieldSVG.select("g");
        const circle = fieldG.selectAll('circle')
            .filter(function() {
                return this.classList.contains(filterClass)
            })
            .data(players)
            .transition()
            .duration(0)
            .attr('fill', function(p) {return p.team})
            .attr('r', function(p) {
                if(controlled)
                    return p.id >= 0 ? p.r*TO_PIXEL_FACTOR : 0;
                return p.id == id ? 0 : p.r*TO_PIXEL_FACTOR;})
            .transition()
            .duration(transitionDuration)
            .ease(d3.easeLinear)
            .attr('cx', function(p) {
                return (controlled ? states.controlledPlayer.x : p.x) *TO_PIXEL_FACTOR})
            .attr('cy', function(p) {
                return (controlled ? states.controlledPlayer.y : p.y) *TO_PIXEL_FACTOR})
            .on("end", resolve);

        const text = fieldG.selectAll("text")
            .filter(function() {
                return this.classList.contains(filterClass)
            })
            .data(players.concat(states.controlledPlayer))
            .transition()
            .duration(0)
            .attr("text-anchor", "middle")
            .text(function(p) {
                if(controlled)
                    return  p.id >= 0 ? p.number : "";
                return p.id == id ? "" : p.number})
            .transition()
            .duration(transitionDuration)
            .ease(d3.easeLinear)
            .attr("x", function(p) {
                return (controlled ? states.controlledPlayer.x : p.x) *TO_PIXEL_FACTOR})
            .attr("y", function(p) {
                return (controlled ? states.controlledPlayer.y : p.y) *TO_PIXEL_FACTOR});
    });
}
