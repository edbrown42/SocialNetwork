//-------------------------------------
//Variables  
//https://blockbuilder.org/mjcoyle/3b8790bb45c628f4d4c599b68553372e

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
