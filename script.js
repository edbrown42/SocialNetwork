//-------------------------------------
//Variables  
//https://blockbuilder.org/mjcoyle/3b8790bb45c628f4d4c599b68553372e

var data = [], defs,gBrush, brush, main_xScale, mini_xScale, main_yScale,
      mini_yScale,main_yZoom, main_xAxis, main_yAxis, mini_width, textScale;

let networkData = [];
let networkLinks = [];
let networkDataFiltered = []; //updated nodes list based on drop down selection
let networkLinksFiltered = []; //updated links list based on drop down selection
let userNames = ["---ALL USERS---"];
let sortedUserNames = [];
let margin = {top:20, right: 120, bottom: 20, left: 120};
let width = 2000 - margin.right - margin.left;
let height = 1000 - margin.top - margin.bottom;

let svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
       // .append("g")
    //.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

let force = d3.layout.force()
    .gravity(0.1)
    .distance(100)
    .linkDistance(60)
    .charge(-100)
    .size([width, height]);

var path;
var node;
var selection; //global variable for radio button selection

var tooltip = d3.select("body").append("div").attr("class", "toolTip").style("display","none");

tooltip.append("text").attr("x", 15).attr("dy", "1.2em").style(
        "text-anchor", "middle").attr("font-size", "12px").attr(
        "font-weight", "bold");

let saveFile = 'fakenews.csv';
//let saveFile = 'fakeNewsMINI.csv';

//------------------------------------------------------------------------------------------
//-----------------------------MAIN PROGRAM-------------------------------------------------
//------------------------------------------------------------------------------------------

//read in data from csv and populate data array
d3.csv(saveFile, function (myArraryOfObjects){

    //Radio Buttons
    d3.selectAll("input[name='choice']").on("change", function(){
        selection = this.value;
        console.log(selection) //debug line to test radio button functionality
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
    data = gatherData(rawBarData);
    console.log(data)

    // create the drop down menu of users
    var tempuserNames=userNames.slice(1);
    tempuserNames.sort();
    sortedUserNames.push(userNames[0]);
    tempuserNames.forEach(function(d){
        sortedUserNames.push(d);
    })
    
    //console.log(sortedUserNames) 

    var selector = d3.select("body")
        .append("select")
        .attr("id", "userSelector")
        .selectAll("option")
        .data(sortedUserNames)
        .enter().append("option")
        .text(function(d) { return d; })
        .attr("value", function (d, i) {
            return i;
        });

    d3.select("#userSelector")
    .on("change", function(d) {
        let index = this.value;
        //console.log(index)
        updateNetwork(index);
    })


    generateNetworkGraph(networkData,networkLinks);
    generateBarChart();


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
    svg.append("svg:defs").selectAll("marker")
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
    path = svg.append("svg:g").selectAll("path")
        .data(force.links())
      .enter().append("svg:path")
    //    .attr("class", function(d) { return "link " + d.type; })
        .attr("class", "link")
        .attr("marker-end", "url(#end)");

    //define the nodes
    node = svg.selectAll(".node")
            //.data(networkData)
            .data(force.nodes())
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
//This functino will determin the nodes color for network graph
//-------------------------------------------------------------------
function getNetworkColor(l,n){
    //console.log("Input: " + l + " Selction: " + selection); //debug line to test incoming data
    if (selection == "notLegit"){
        return ((l > n) ? 'grey' : 'red');
    }else if (selection == "Legit"){
        return ((l > n) ? 'green' : 'grey');
    }else{
        return ((l > n) ? 'green' : 'red');
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
//Gather Data
//-------------------------
function gatherData(inputData){
      let outputData = []
      
      for (var i = 0; i < inputData.length; i++){
        let datum = {};
        datum.key = i;
        datum.country = inputData[i].date;
        datum.gtLabel = "greater";
        datum.value = inputData[i].legitimate;
        datum.ltLabel = "Lesser";
        datum.result =inputData[i].notLegitimate;
        outputData.push(datum);
      }

      return outputData;
}

//-------------------------
//Generate Bar Chart
//-------------------------
function generateBarChart() {

    // var zoomer = d3.behavior.zoom()
    //     .on("zoom", null);

    var main_margin = {top: 10, right: 10, bottom: 30, left: 200},
        main_width = 700 - main_margin.left - main_margin.right,
        main_height = 250 - main_margin.top - main_margin.bottom;

    var mini_margin = {top: 10, right: 10, bottom: 30, left: 10},
        mini_height = 250 - mini_margin.top - mini_margin.bottom;
        mini_width = 100 - mini_margin.left - mini_margin.right;

    svg = d3.select("body").append("svg")
        .attr("class", "svgWrapper")
        .attr("width", main_width + main_margin.left + main_margin.right + mini_width + mini_margin.left + mini_margin.right)
        .attr("height", main_height + main_margin.top + main_margin.bottom);

        // .call(zoomer)
        // .on("wheel.zoom", scroll)
        // .on("mousedown.zoom", null)
        // .on("touchstart.zoom", null)
        // .on("touchmove.zoom", null)
        // .on("touchend.zoom", null);

    var mainGroup = svg.append("g")
        .attr("class","mainGroupWrapper")
        .attr("transform","translate(180,10)")
        .append("g")
        .attr("clip-path", "url(#clip)")
        .style("clip-path", "url(#clip)")
        .attr("class","mainGroup");

    var miniGroup = svg.append("g")
        .attr("class","miniGroup")
        .attr("transform","translate(135,10)");

    var brushGroup = svg.append("g")
        .attr("class","brushGroup")
        .attr("transform","translate(135,10)");

    main_xScale = d3.scale.linear().range([0, main_width]);
    mini_xScale = d3.scale.linear().range([0, mini_width]);

    main_yScale = d3.scale.ordinal().rangeBands([0, main_height], 0.4, 0);
    mini_yScale = d3.scale.ordinal().rangeBands([0, mini_height], 0.4, 0);

    main_yZoom = d3.scale.linear()
        .range([0, main_height])
        .domain([0, main_height]);

    main_xAxis = d3.svg.axis()
      .scale(main_xScale)
      .orient("bottom")
      .tickFormat(d3.format(".2s"));

    d3.select(".mainGroupWrapper")
        .append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + 0 + "," + (main_height + 5) + ")");

    svg.append("text") 
        .attr("transform", "translate(" + (main_width / 2) + " ," + (main_height + (main_margin.bottom -60) ) +")")
        .attr("dy", ".71em")
        .attr("class", "x axis")
        .attr("stroke-width",1)
        .style("font-size","15px")
        .text("");

    main_yAxis = d3.svg.axis()
      .scale(main_yScale)
      .orient("left").tickSize(5);

    mainGroup.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(-48,0)");

    main_xScale.domain([0, d3.max(data, function(d) { return d.value; })]);
    mini_xScale.domain([0, d3.max(data, function(d) { return d.value; })]);
    main_yScale.domain(data.map(function(d) { return d.country; }));
    mini_yScale.domain(data.map(function(d) { return d.country; }));

    d3.select(".mainGroup").select(".y.axis").call(main_yAxis);

    textScale = d3.scale.linear()
      .domain([25,50])
      .range([12,6])
      .clamp(true);

    var brushExtent = 10;// Math.max( 1, Math.min( 20, Math.round(data.length*0.2)));

    brush = d3.svg.brush()
        .y(mini_yScale)
        .extent([mini_yScale(data[0].country), mini_yScale(data[brushExtent].country)])
        .on("brush", brushmove);

    gBrush = d3.select(".brushGroup").append("g")
      .attr("class", "brush")
      .call(brush);
    
    gBrush.selectAll(".resize")
      .append("line")
      .attr("x2", 40);

    gBrush.selectAll("rect")
      .attr("width", 40);

    gBrush.select(".background")
      .on("mousedown.brush", brushcenter)
      .on("touchstart.brush", brushcenter);

    defs = svg.append("defs")

    defs.append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("x", -main_margin.left)
      .attr("width", main_width + main_margin.left)
      .attr("height", main_height);


    var mini_bar = d3.select(".miniGroup").selectAll(".bar")
      .data(data, function(d) { return d.key; });

    mini_bar
      .attr("width", function(d) { return (mini_xScale(d.value)/2.2); })
      .attr("y", function(d,i) { return mini_yScale(d.country); })
      .attr("height", mini_yScale.rangeBand());

    mini_bar.enter().append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("width", function(d) { return mini_xScale(d.value/2.2); })
      .attr("y", function(d,i) { return mini_yScale(d.country); })
      .attr("height", mini_yScale.rangeBand())
      .style("fill", "url(#gradient-rainbow-mini)");

    mini_bar.exit()
      .remove();

    gBrush.call(brush.event);
    
}


function update() {

    // var divTooltip = svg.append("div").attr("class", "toolTip");

    if (d3.select(".mainGroup").select(".bar2.greater").empty()) {
        var bar = d3.select(".mainGroup").selectAll(null)
          .data(data, function(d) { return d.key; });
        bar.enter().append("rect")
           .attr("class", "bar2 greater")
           //.attr("fill", "#1f77b4")
           .attr("fill","green")
           .attr("x", 0);

        bar.enter().append("rect")
           .attr("class", "bar2 lesser")
           //.attr("fill", "#ff7f0e")
           .attr("fill","red")
           .attr("x", 0);
    }

    d3.selectAll(".bar2.greater")
      .attr("y", function(d) { return main_yScale(d.country) + main_yScale.rangeBand()/2; })
      .attr("width", function(d) { return main_xScale(d.value); })
                .on("mouseover", function(){tooltip.style("display",null);})
                .on("mouseout", function() {tooltip.style("display", "none");})
                .on("mousemove",function(d) {
                    tooltip.style("left", d3.event.pageX+10+"px");
                    tooltip.style("top", d3.event.pageY-25+"px");
                    tooltip.style("display", "inline-block");
                    tooltip.select("text").html(d.country + '<br />' + "Legitimate: "+d.value+'<br />'+"Not legitimate: " + d.result);})
                    //tooltip.select("text").html("test");})
      .attr("height", main_yScale.rangeBand()/2);

    d3.selectAll(".bar2.lesser")
      .attr("y", function(d,i) { return main_yScale(d.country); })
      .attr("width", function(d) { return main_xScale(d.result); })
                .on("mouseover", function(){tooltip.style("display",null);})
                .on("mouseout", function() {tooltip.style("display", "none");})
                .on("mousemove",function(d) {
                    tooltip.style("left", d3.event.pageX+10+"px");
                    tooltip.style("top", d3.event.pageY-25+"px");
                    tooltip.style("display", "inline-block");
                    tooltip.select("text").html(d.country + '<br />' + "Legitimate: "+d.value+'<br />'+"Not legitimate: " + d.result);})
                    //tooltip.select("text").html("test");})
      .attr("height", main_yScale.rangeBand()/2);


    // bar
    //   .attr("y", function(d,i) { return main_yScale(d.country); })
    //   .attr("height", main_yScale.rangeBand())
    //   .attr("x", 0)
    //   .transition().duration(50)
    //   .attr("width", function(d) { return main_xScale(d.value); });

    // var bar1= bar.enter().append("rect")
    //   .attr("class", "bar2")
    // //   .attr("id","greater")
    // //   .style("fill", "#1f77b4")
    // //   .attr("fill", function(d,i) { return "#000" })
    //   .attr("fill", "#1f77b4")
    //   .attr("y", function(d,i) { return main_yScale(d.country) + main_yScale.rangeBand()/2; })
    //   .attr("height", main_yScale.rangeBand()/2)
    //   .attr("x", 0)
    //   .transition().duration(50)
    //   .attr("width", function(d) { return main_xScale(d.value); });

    // // console.log(bar1);
    // var bar2 = bar.enter().append("rect")
    //   .attr("class", "bar2")
    // //   .attr("id","lesser")
    // //   .style("fill", "#ff7f0e")
    //   .attr("fill", "#ff7f0e")
    //   .attr("y", function(d,i) { return main_yScale(d.country); })
    //   .attr("height", main_yScale.rangeBand()/2)
    //   .attr("x", 0)
    //   .transition().duration(50)
    //   .attr("width", function(d) { return main_xScale(d.result); });

    // console.log(bar2);

    // var dwellTimeSecsEntered = $("#dwellTimeSecs").val();

    // var lessValue = "value";
    // var greaterValues = "result";
    // var tip = d3.tip()
    //   .attr('class', 'd3-tip')
    //   .offset([10, 75])
    //   .html(function(d) {
    //     return "<strong>"+d.country+ " </strong><br>" +
    //       ""+lessValue+" :<span style='color:black'>" + d.result + "</span><br>"+greaterValues+": <span style='color:black'>" + d.value + "</span><br>";
    //     });

    // bar.on('mouseover', tip.show)
    //    .on('mouseout', tip.hide);

    // svg.call(tip);

    // bar.exit()
    //    .remove();
}

function brushmove() {

    var extent = brush.extent();

    var selected = mini_yScale.domain()
      .filter(function(d) { return (extent[0] - mini_yScale.rangeBand() + 1e-2 <= mini_yScale(d)) && (mini_yScale(d) <= extent[1] - 1e-2); }); 

    d3.select(".miniGroup").selectAll(".bar")
      .style("fill", "lightGrey");

    d3.selectAll(".y.axis text")
      .style("font-size", textScale(selected.length));
    var originalRange = main_yZoom.range();
    main_yZoom.domain( extent );

    main_yScale.domain(data.map(function(d) { return d.country; }));
    main_yScale.rangeBands( [ main_yZoom(originalRange[0]), main_yZoom(originalRange[1]) ], 0.4, 0);

    d3.select(".mainGroup")
      .select(".y.axis")
      .call(main_yAxis);

    // keep x-axis at the same scale independet of selected brush range
    // var newMaxXScale = d3.max(data, function(d) { return selected.indexOf(d.country) > -1 ? d.value : 0; });
    // main_xScale.domain([0, newMaxXScale]);

    // can be moved to the init() call
    d3.select(".mainGroupWrapper")
      .select(".x.axis")
      .transition().duration(50)
      .call(main_xAxis);

    update();
}

function brushcenter() {
    var target = d3.event.target,
        extent = brush.extent(),
        size = extent[1] - extent[0],
        range = mini_yScale.range(),
        y0 = d3.min(range) + size / 2,
        y1 = d3.max(range) + mini_yScale.rangeBand() - size / 2,
        center = Math.max( y0, Math.min( y1, d3.mouse(target)[1] ) );

    d3.event.stopPropagation();

    gBrush
        .call(brush.extent([center - size / 2, center + size / 2]))
        .call(brush.event);
}

function scroll() {

    var extent = brush.extent(),
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