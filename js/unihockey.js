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

    // first clean actual content
    d3.select("#mainRow").html("");

    // init the states global variable
    states.isPlaying = false;
    states.currentFrameId = 0;
    states.controlledPlayer = {id:-1, x: 0, y: 0, r: 0.5, team: "red", number: "0"};

    // Get the frames
    const frames = level.frames;
    updateCurrentFrameLabel(0, frames.length);
    $('#filename').val(level.name);

    const fieldSVG = d3.select("#mainRow").append("svg")
        .attr("id", level.name)
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
    $(document).off().keypress(function(event){
        const charCode = event.which;
        if(charCode >= 52 && charCode <= 57 && !states.isPlaying){ // 4, 5, 6, 7, 8, 9
            selectPlayer(fieldSVG, frames, charCode - 50)
        }
        else if (charCode == 45 && !states.isPlaying) { // - (prev)
            prevFrame(fieldSVG, frames);
        }
        else if (charCode == 43 && !states.isPlaying) { // + (next)
            nextFrame(fieldSVG, frames);
        }
        else if (charCode == 97 && !states.isPlaying) { // a(dd)
            addFrameHere(fieldSVG, frames);
        }
        else if (charCode == 114 && !states.isPlaying) { // r(emove)
            removeFrameHere(fieldSVG, frames);
        }
        else if (charCode == 112 && !states.isPlaying) { // p(lay)
            playNext(fieldSVG, frames, 0);
        }
        else if (charCode == 115 && !states.isPlaying) { // s(ave)
            savePlayer(frames)
            selectPlayer(fieldSVG, frames, -1)
            console.log("save")
        }
        else if(MESSAGE){ // all others
            console.log(charCode + ": " +String.fromCharCode(charCode));
        }
    });

    $('#file-open').off().change(function(e){
        readLevelFile(e);
    });

    $('#playButton').off().click(function(e){
        if(!states.isPlaying){
            playNext(fieldSVG, frames, 0);
        }
    });

    $('#prevButton').off().click(function(e){
        if(!states.isPlaying){
            prevFrame(fieldSVG, frames);
        }
    });

    $('#nextButton').off().click(function(e){
        if(!states.isPlaying){
            nextFrame(fieldSVG, frames);
        }
    });

    $('#addButton').off().click(function(e){
        if(!states.isPlaying){
            addFrameHere(fieldSVG, frames);
        }
    });

    $('#removeButton').off().click(function(e){
        if(!states.isPlaying){
            removeFrameHere(fieldSVG, frames);
        }
    });

    $('#saveButton').off().click("click", function(e){
        writeLevelFile(level);
    });

    $('.playerSelector').off().click(function(e){
        const button = $(this);
        button.focusout();
        if(!states.isPlaying){
            const selectedPlayer = button.val();
            selectPlayer(fieldSVG, frames, selectedPlayer)
        }
    });
}

function savePlayer(frames){
    const player = frames[states.currentFrameId][states.controlledPlayer.id];
    if(typeof player != "undefined"){
        player.x = states.controlledPlayer.x;
        player.y = states.controlledPlayer.y;
    }
}

function selectPlayer(fieldSVG, frames, playerId){
    $('.playerSelector').removeClass("selectedPlayer");
    $('.playerSelector[value='+playerId+']').addClass("selectedPlayer");

    if(playerId >= 2 && playerId <= 7){
        states.controlledPlayer = $.extend(true, {}, frames[states.currentFrameId][playerId]);
        updatePlayers(fieldSVG, frames[states.currentFrameId])
        updatePlayers(fieldSVG, [states.controlledPlayer], filterClass="controlled", transitionDuration=0)
    }else if(playerId < 0){
        states.controlledPlayer.id = -1;
        updatePlayers(fieldSVG, [states.controlledPlayer], filterClass="controlled")
        updatePlayers(fieldSVG, frames[states.currentFrameId], filterClass="bot", transitionDuration=0)
    }
    else{
        console.log("error index in select player");
    }
}

//
function prevFrame(fieldSVG, frames){
    const newFrame = Math.max(0, states.currentFrameId-1);
    if(states.currentFrameId != newFrame){
        states.currentFrameId = newFrame;
        updatePlayers(fieldSVG, frames[newFrame])
    }
    updateCurrentFrameLabel(newFrame, frames.length);
}

//
function nextFrame(fieldSVG, frames){
    const newFrame = Math.min(states.currentFrameId+1, frames.length-1);
    if(states.currentFrameId != newFrame){
        states.currentFrameId = newFrame;
        updatePlayers(fieldSVG, frames[newFrame])
    }
    updateCurrentFrameLabel(newFrame, frames.length);
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
        updateCurrentFrameLabel(id, frames.length);
    }
}

//
function playNext(fieldSVG, frames, frameId){
    updateCurrentFrameLabel(frameId, frames.length);
    let promise = updatePlayers(fieldSVG, frames[frameId]);
    if(frameId == 0){
        states.isPlaying = true;
        $('.roundButton').attr("disabled", true);

        // TODO play annimation 3, 2, 1
    }
    const newFrame = Math.min(frameId+1, frames.length-1);
    promise.then(function() {
        if(newFrame > frameId){
            playNext(fieldSVG, frames, newFrame);
        }else {
            updateCurrentFrameLabel(states.currentFrameId, frames.length);
            updatePlayers(fieldSVG, frames[states.currentFrameId])
            states.isPlaying = false;
            $('.roundButton').attr("disabled", false);
        }
    });
}

//
function updateCurrentFrameLabel(id, length){
    $("#currentButton").text((id+1)+"/"+length)
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

function writeLevelFile(level){
    const fileName = $("#filename").val();
    level.name = fileName;
    const blob = new Blob([JSON.stringify(level)], {type: "text/plain;charset=utf-8"});
    saveAs(blob, fileName+".json");
}

function readLevelFile(e) {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith(".json")) {
        console.log("Not a json file")
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const contents = e.target.result;
        init(JSON.parse(contents));
    };
    reader.readAsText(file);
}
