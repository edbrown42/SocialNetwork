//-------------------------------------
//Variables        TODO: remove ones that are no longer needed
//-------------------------------------
var data = [], defs, brush,main_yZoom, textScale;

let legitColor = 'Green'; //color to represent Believes_legitimate: True
let notLegitColor = 'Red'; //color to represent Believes_legitimate: False
let networkData = [];
let networkLinks = [];
let networkDataFiltered = []; //updated nodes list based on drop down selection
let networkLinksFiltered = []; //updated links list based on drop down selection
let userNames = ["---ALL USERS---"];
let sortedUserNames = [];

//These correlate to the network graph
let margin = {top:20, right: 120, bottom: 20, left: 120};
let width = 1000 - margin.right - margin.left;
let height = 750 - margin.top - margin.bottom;

//These correlate to the bar chart
let barMargin = {top: 40, right: 30, bottom: 35, left: 30};
let barWidth = 850 - barMargin.left - barMargin.right;
let barHeight = 500 - barMargin.top - barMargin.bottom;

var zoom = d3.behavior.zoom()
    .scaleExtent([-5,10])
    .on("zoom", zoomed)

//svg element for the network graph
let svgSoical = d3.select("#SocialNetwork").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    //.attr('x',10)
    .style("border", "1px solid black")
   // .style('position','absolute')
    .call(zoom)
    .append('svg:g');
    
    /*.attr("width", "100%")
    .attr("height", "100%")
    .call(d3.behavior.zoom().on("zoom", function () {
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
    }))
    .append("g")*/

    //.append("svg")
    //.attr("width", width + margin.right + margin.left)
    //.attr("height", height + margin.top + margin.bottom)
       // .append("g")
    //.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//svg element for the bar chart
let svg = d3.select("#BarChart").append("svg")
    .attr("width", barWidth + barMargin.left + barMargin.right)
    .attr("height", barHeight + barMargin.top + barMargin.bottom)
    .append("g")
    .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");
  
    
//force variable for network graph
let force = d3.layout.force()
    //.gravity(0.1)
    //.distance(100)
    .linkDistance(60) //originally 60
    .charge(-40) //originally -100
    .size([width, height]);


force.drag().on("dragstart", function() { d3.event.sourceEvent.stopPropagation(); });

var path;
var node;
var selection; //global variable for radio button selection

let tooltip = d3.select("body").append("div").attr("class", "toolTip").style("display","none");

tooltip.append("text").attr("x", 15).attr("dy", "1.2em").style(
        "text-anchor", "middle").attr("font-size", "12px").attr(
        "font-weight", "bold");

let saveFile = 'fakenews.csv'; //file to read from
//let saveFile = 'fakeNewsMINI.csv';

//------------------------------------------------------------------------------------------
//-----------------------------MAIN PROGRAM-------------------------------------------------
//------------------------------------------------------------------------------------------

//read in data from csv and populate data array
d3.csv(saveFile, function (myArraryOfObjects){

    //Radio Buttons
    d3.selectAll("input[name='choice']").on("change", function(){
        selection = this.value;
        //console.log(selection) //debug line to test radio button functionality
        d3.selectAll(".node").select('circle').transition()
            .style('fill', function(d,i){return getNetworkColor(d.legitCount,d.notLegitCount);})
            .attr("r", function(d,i){return getCircleSize(d.legitCount,d.notLegitCount);});
    });



    renderNetworkData(myArraryOfObjects);
    //console.log(networkData); // debug line to anaylize structure of networkData array
    //console.log(networkLinks); //debug line to show network links
    //console.log(userNames);

    //generate bar chart data
    let rawBarData = gatherBarChartData(myArraryOfObjects);
    console.log(rawBarData);


    // create the drop down menu of users
    let tempuserNames=userNames.slice(1);
    tempuserNames.sort();
    sortedUserNames.push(userNames[0]);
    tempuserNames.forEach(function(d){
        sortedUserNames.push(d);
    })
    
    //console.log(sortedUserNames) 

    let selector = d3.select("#userSelector")
        .append("select")
        .attr("id", "Selector")
        .selectAll("option")
        .data(sortedUserNames)
        .enter().append("option")
        .text(function(d) { return d; })
        .attr("value", function (d, i) {
            return i;
        });

    d3.select("#Selector")
        .on("change", function(d) {
            let index = this.value;
            //console.log(index)
            updateNetwork(index);
        })

    generateNetworkGraph(networkData,networkLinks);
    generateBarChart(rawBarData);

});


//-------------------------------------------------------------------
//this function will get data into acceptable format for social graph
//-------------------------------------------------------------------
function renderNetworkData(myInputData){
    //console.log(myInputData); //debug line - making sure input data has been recieved into function

    myInputData.forEach(function (d){
        let datum = {}; //blank object to parse data from each line into
        let tweetDatum = {};

        //storing the data we want from the csv into the datum object (user info)
        datum.userID = d.user_id; 
        datum.userName = d.user_name;
        datum.legitCount = 0; //set initial total count to 0
        datum.notLegitCount = 0; //set initial total count to 0
        datum.tweets = [];
        //storing the data we want from the csv into the tweet object (tweet info)
        tweetDatum.tweetID = d.tweet_id;
        tweetDatum.retweet =  d.retweet_from;
        tweetDatum.date = d.post_date;
        tweetDatum.believed = d.believes_legitimate;
        //update legit/notLegit count
        if (tweetDatum.believed == " True "){
            datum.legitCount++;
        }else{
            datum.notLegitCount++;
        }


        //populate networkData array
        if(networkData.length == 0){
            //if data is empty (IE this is the first entry) add first element
            datum.tweets.push(tweetDatum);
            let newLength = networkData.push(datum);
            userNames.push(datum.userName);
        } else {
            //search existing data to see if user has been entered yet
            let found = 0; //flag to see if user already exist
            for(var i=0;i<networkData.length;i++){
                if (networkData[i].userID == datum.userID){
                    //if user already exist
                    found =1; //toggle flag
                    let newLength = networkData[i].tweets.push(tweetDatum) //push tweet data to the user
                            //update legit/notLegit count
                    if (tweetDatum.believed == " True "){
                        networkData[i].legitCount++;
                    }else{
                        networkData[i].notLegitCount++;
                    }
                    break;
                }
            }
            //if not an existing user push data
            if (found == 0){
                datum.tweets.push(tweetDatum);
                let newLength = networkData.push(datum); 
                userNames.push(datum.userName);
            }
        }

        

        //if the data is retweeted create a link
        if (tweetDatum.retweet != " None "){
            let linkDatum = {}; //create a new object to store the link data
            linkDatum.source = null;
            linkDatum.target = null;

            //loop thru and find index of original tweet and retweet
            for(var i = 0; i<networkData.length; i++){
                if (networkData[i].userID == tweetDatum.retweet){
                    linkDatum.source = i; //position of original tweet
                }
                if (networkData[i].userID == datum.userID){
                    linkDatum.target = i; //position of the retweet
                }
            }

            //add link to array
            if ((linkDatum.source != null) && (linkDatum.target != null)){
                let newLinkLength = networkLinks.push(linkDatum);
            }
        }
    })
}

//-------------------------------------------------------------------
//This function will generate the tree diagram
//-------------------------------------------------------------------
function generateNetworkGraph(nodeData,linkData){
    force
        .nodes(nodeData)
       // .nodes(d3.values(networkData))
        .links(linkData)
        .on("tick",tick)
        .start();

    // build the arrow.
    svgSoical.append("svg:defs").selectAll("marker")
        .data(["end"])      // Different link/path types can be defined here
      .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    // add the links and the arrows
    path = svgSoical.append("svg:g").selectAll("path")
        .data(force.links())
      .enter().append("svg:path")
    //    .attr("class", function(d) { return "link " + d.type; })
        .attr("class", "link")
        .attr("marker-end", "url(#end)");

    //define the nodes
    node = svgSoical.selectAll(".node")
            //.data(networkData)
            .data(force.nodes())
            .call(force.drag)
        .enter().append("g")
            .attr("class", "node")
            .on("mouseover", function(){tooltip.style("display",null);})
            .on("mouseout", function() {tooltip.style("display", "none");})
            .on("mousemove",function(d) {
                tooltip.style("left", d3.event.pageX+10+"px");
                tooltip.style("top", d3.event.pageY-25+"px");
                tooltip.style("display", "inline-block");
                tooltip.select("text").html("User: "+d.userName+'<br/>'+"Legitimate: " + d.legitCount+'<br/>'+"Not Legitimate: "+d.notLegitCount);})
            .call(force.drag);

    //add the nodes
    node.append('circle')
        .attr('r', 5)
        .attr('fill', function(d,i){return getNetworkColor(d.legitCount,d.notLegitCount);});


} 

//-------------------------------------------------------------------
//This function will determine the node's color for network graph
//-------------------------------------------------------------------
function getNetworkColor(l,n){
    //console.log("Input: " + l + " Selction: " + selection); //debug line to test incoming data
    if (selection == "notLegit"){
        return ((l > n) ? 'grey' : notLegitColor);
    }else if (selection == "Legit"){
        return ((l > n) ? legitColor : 'grey');
    }else{
        return ((l > n) ? legitColor : notLegitColor);
    }
}

//-------------------------------------------------------------------
// Get Circle Size
//-------------------------------------------------------------------
function getCircleSize(l,n) {
    if (selection == "notLegit"){
        return ((l>n) ? 5 : 8);
    }else if (selection == "Legit"){
        return ((l>n) ? 8 : 5);
    }else{
        return 5;
    }
}

//-------------------------------------------------------------------
//Tick function - adds the curvy lines
//-------------------------------------------------------------------
function tick(){

    path.attr("d", function(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
        return "M" + 
            d.source.x + "," + 
            d.source.y + "A" + 
            dr + "," + dr + " 0 0,1 " + 
            d.target.x + "," + 
            d.target.y;
    });

    //enables nodes to be moved
    node
        .attr("transform", function(d) { 
        return "translate(" + d.x + "," + d.y + ")"; });
}

//-------------------------------------------------------------------
//Update function based off drop down menu
//-------------------------------------------------------------------
function updateNetwork(selected){
    
    let position = null; //postion of selected user in network data array
    if(selected!=0){
        //find entry within networkData
        for(var i = 0; i<networkData.length;i++){
            if (networkData[i].userName == sortedUserNames[selected]){
                position = i;
                //console.log("found it: " + selected + " "+ position); //debug line
                //console.log(networkData[i]);
                //console.log(sortedUserNames[selected]);
                break;
            }
        }

        //make a new links list (filtered by people in "selected's" network)
        networkLinksFiltered = []; //clear list
        for(var i = 0; i<networkLinks.length;i++){
            if ((networkLinks[i].target.userName == networkData[position].userName)||(networkLinks[i].source.userName == networkData[position].userName)) {
                networkLinksFiltered.push(networkLinks[i]);
            }
        }
        //console.log(networkLinksFiltered);

        //make a new list of users based off of who is in "selected's" network
        let newNames = [];
        newNames.push(sortedUserNames[selected]); //push selected user name onto list
        //loop through and add new names based on targetID
        for(var i=0;i<networkLinksFiltered.length;i++){
            let found = 0;
            for (var j=0;j<newNames.length;j++){
                if(networkLinksFiltered[i].target.userName==newNames[j]){
                    found = 1;
                    break
                }
            }
            if (found==0){
                newNames.push(networkLinksFiltered[i].target.userName)
            }
        }
        //loop through and add new names based on sourceID
        for(var i=0;i<networkLinksFiltered.length;i++){
            let found = 0;
            for (var j=0;j<newNames.length;j++){
                if(networkLinksFiltered[i].source.userName==newNames[j]){
                    found = 1;
                    break
                }
            }
            if (found==0){
                newNames.push(networkLinksFiltered[i].source.userName)
            }
        }
        //console.log(newNames)

        //make a new node list (filtered by people in "selected's" network)
        networkDataFiltered = []; //clear list
        for(var i=0;i<networkData.length;i++){
            for(var j=0;j<newNames.length;j++){
                if(networkData[i].userName == newNames[j]){
                    networkDataFiltered.push(networkData[i]);
                }
            }
        }
        //console.log(networkDataFiltered)

        //clear graph
        d3.selectAll(".node").remove();
        d3.selectAll("path").remove();
        //redraw graph
        generateNetworkGraph(networkDataFiltered,networkLinksFiltered);
    }else{
        //if all users selected regenerate whole graph
        //clear graph
        d3.selectAll(".node").remove();
        d3.selectAll("path").remove();
        //redraw graph
        generateNetworkGraph(networkData,networkLinks);
    }
}

//-------------------------
//Get Bar Chart Data - Takes CSV and generates totals per day
//-------------------------
function gatherBarChartData(inputData){
    let outputData = [];

    inputData.forEach(function (d){
        let datum = {};
        datum.date = d.post_date.slice(1,11);
        datum.legitimate=0;
        datum.notLegitimate=0;
        if (d.believes_legitimate==" True "){
            datum.legitimate++;
        }else{
            datum.notLegitimate++;
        }
        let found = 0; //variable flag to determine if date has already been entered

        if (outputData.length == 0){ //if this is the first element, enter it into the array
            let newLength = outputData.push(datum);
        }else{ //if not search array to see if date already exists
            for(var i = 0; i < outputData.length; i++){
                let result = outputData[i].date.localeCompare(datum.date);
                //console.log ("Result is " + result);
                if (result == 0){
                    found = 1;
                    outputData[i].legitimate += datum.legitimate;
                    outputData[i].notLegitimate += datum.notLegitimate;
                    break;
                }
            }

            if (found==0){ //if date has not been found add to array
                var newLenth = outputData.push(datum);
            }
        }
    })

    return outputData;
}

//-------------------------
//Generate Bar Chart
//-------------------------
function generateBarChart(rawData) {
    let subgroups = ["legitimate","notLegitimate"];

    let datesProvided = d3.map(rawData,function(d){return d.date}).keys();
    //console.log(datesProvided)
    
    //transpose the data into layers
    let layers = d3.layout.stack()(subgroups.map(
        function(tweet) {
            return rawData.map(function(d) {
                return {x: (d.date), y:+d[tweet]};
            });
        }));
    //console.log(layers);

    // Set x, y and colors
    let x = d3.scale.ordinal()
        .domain(layers[0].map(function(d) { return d.x; }))
        .rangeRoundBands([10, barWidth-10], 0.02);

    let y = d3.scale.linear()
        .domain([0, d3.max(layers, function(d) {  return d3.max(d, function(d) { return d.y0 + d.y; });  })])
        .range([barHeight, 0]);

    let colors = [legitColor, notLegitColor];

    // Define and draw axes
    let yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5)
        .tickSize(-barWidth, 0, 0)
        .tickFormat( function(d) { return d } );

    let xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        //.tickFormat(d3.time.format("%Y"));

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + barHeight + ")")
        .call(xAxis);

    // Create groups for each series, rects for each segment 
    let groups = svg.selectAll("g.cost")
        .data(layers)
        .enter().append("g")
        .attr("class", "cost")
        .style("fill", function(d, i) { return colors[i]; });

    let rect = groups.selectAll("rect")
        .data(function(d) { return d; })
        .enter()
        .append("rect")
        .attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y0 + d.y); })
        .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
        .attr("width", x.rangeBand())
        .on("mouseover", function() { tooltip.style("display", null); })
        .on("mouseout", function() { tooltip.style("display", "none"); })
        .on("mousemove", function(d) {
            let xPosition = d3.mouse(this)[0] - 15;
            let yPosition = d3.mouse(this)[1] - 25;
            tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
            tooltip.select("text").text(d.y); //might be able to get ride of this tooltip since brush is now on top of it
        });

    // Draw legend
    let legend = svg.selectAll(".legend")
        .data(colors)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(-125," + (-19+(i * -19)) + ")"; });
 
    legend.append("rect")
        .attr("x", barWidth - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d, i) {return colors.slice().reverse()[i];});
 
    legend.append("text")
        .attr("x", barWidth + 5)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(function(d, i) { 
            switch (i) {
            case 0: return "Believes_legitimate: False";
            case 1: return "Believes_legitimate: True";
            case 2: return "Neutral";
            }
        });

    // Prep the tooltip bits, initial display is hidden
    let tooltip = svg.append("g")
        .attr("class", "tooltip")
        .style("display", "none");
  
    tooltip.append("rect")
        .attr("width", 30)
        .attr("height", 20)
        .attr("fill", "white")
        .style("opacity", 0.5);

    tooltip.append("text")
        .attr("x", 15)
        .attr("dy", "1.2em")
        .style("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold");
 
    // define brush control element and its events
    brush = d3.svg.brush()
        .x(x)
        .on("brushstart", brushstart)
        .on("brush", brushmove)
        .on("brushend", brushend);

    // create svg group with class brush and call brush on it
    let brushg = svg.append("g")
        .attr("class", "brush")
        .call(brush);

    // set brush extent to rect and define objects height
    brushg.selectAll("rect")
        .attr("height", barHeight);

}

//----------------------
//--------Scroll Function
//----------------------
function scroll() {

    let extent = brush.extent(),
      size = extent[1] - extent[0],
      range = mini_yScale.range(),
      y0 = d3.min(range),
      y1 = d3.max(range) + mini_yScale.rangeBand(),
      dy = d3.event.deltaY,
      topSection;

    if ( extent[0] - dy < y0 ) { topSection = y0; } 
    else if ( extent[1] - dy > y1 ) { topSection = y1 - size; } 
    else { topSection = extent[0] - dy; }

    d3.event.stopPropagation();
    d3.event.preventDefault();

    gBrush
        .call(brush.extent([ topSection, topSection + size ]))
        .call(brush.event);
}

//----------------------
//--------Zoom Function
//----------------------
function zoomed() {
    svgSoical.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

//--------------------
//Drag Functions
//--------------------
function dragstarted(d) {
    d3.event.sourceEvent.stopPropagation();
  
    d3.select(this).classed("dragging", true);
    force.start();
}
  
function dragged(d) {
    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}
  
function dragended(d) {
    d3.select(this).classed("dragging", false);
}


//-------------------------
//Brush Functions
//-------------------------
function brushstart() {
    // console.log('brushstart event is triggered');
}
  
function brushmove() {
    // console.log('the brush event is currently triggered');
}
  
function brushend() {
    // console.log('NOTE: brushend event is triggered');
    // console.log('Is the brush empty: ' + brush.empty());
    console.log('Extent of brush: ' +  brush.extent() );
}