(function(){
    var year = "2010";
    //var dataFile = "data/ag.lnd.agri.zs_Indicator_en_csv_v2.csv";
    var dataFile = "data/SP.URB.TOTL.IN.ZS_Indicator_en_csv_v2.csv";
    var countryIndices = {};
    var evtScale, evtTrans;
    var fillRange;

    //load csv file
    d3.csv(dataFile, function(err, countryIndex) {

        var minScale,maxScale, minYear = 1960, maxYear = 2012,ix;

        countryIndex.forEach(function(row){
            countryIndices[row["Country Name"]] = row;

            for(ix=minYear;ix<maxYear;ix++){
                var newVal = parseFloat(row[ix.toString()]);
                if(isNaN(newVal)){continue;}
                if(!minScale) {
                    minScale = newVal;
                    maxScale = minScale;
                }
                minScale = Math.min(minScale, newVal);
                maxScale = Math.max(maxScale, newVal);
            }
        });

        fillRange = d3.scale.linear()
            .domain([minScale,maxScale])
            .range(["cyan", "steelblue"]);
    });
//initialize slider
    $("#slider").slider();
//change year
    $("#slider").on('slide', function(slideEvt) {
        $("#sliderVal").text(slideEvt.value);
        if(slideEvt.value[0]){
            year = slideEvt.value[0].toString();
            redraw();
        }
    });

    d3.select(window).on("resize", throttle);

    var zoom = d3.behavior.zoom()
        .scaleExtent([1, 9])
        .on("zoom", move);


    var width = document.getElementById('container').offsetWidth;
    var height = width / 2;

    var topo,projection,path,svg,g;

    var graticule = d3.geo.graticule();

    var tooltip = d3.select("#container").append("div").attr("class", "tooltip hidden");

    setup(width,height);

    function setup(width,height){
        projection = d3.geo.mercator()
            .translate([(width/2), (height/2)])
            .scale( width / 2 / Math.PI);

        path = d3.geo.path().projection(projection);

        svg = d3.select("#container").append("svg")
            .attr("width", width)
            .attr("height", height)
            .call(zoom)
            .on("click", click)
            .append("g");

        g = svg.append("g");

    }


    d3.json("data/world-topo-min.json", function(error, world) {

        var countries = topojson.feature(world, world.objects.countries).features;
        //var neighbors = topojson.neighbors(world.objects.countries.geometries);

        topo = countries;
        //draw(topo, neighbors);
        draw(topo);

    });

    //function draw(countries, neighbors) {
    function draw(countries, neighbors) {

        svg.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path);


        g.append("path")
            .datum({type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]})
            .attr("class", "equator")
            .attr("d", path);


        var country = g.selectAll(".country").data(countries);

        country.enter().insert("path")
            .attr("class", "country")
            .attr("d", path)
            .attr("id", function(d,i) { return d.id; })
            .attr("title", function(d,i) { return d.properties.name; })
            //.style("fill", function(d, i) {return d.properties.color;});
            .style("fill", function(d) {
                var ctry = countryIndices[d.properties.name];
                if(ctry && (ctry[year] != "")){
                    var index = parseFloat(ctry[year]);
                    return fillRange(index);
                }
                return d3.rgb("lightgrey");
            });

        //offsets for tooltips
        var offsetL = document.getElementById('container').offsetLeft+20;
        var offsetT = document.getElementById('container').offsetTop+10;

        //tooltips
        country
            .on("mousemove", function(d,i) {

                var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );

                var ctry = countryIndices[d.properties.name];
                var indexStrValue = '';
                if(ctry && (ctry[year] != "")) {
                    indexStrValue = ': ' + ctry[year];
                }

                tooltip.classed("hidden", false)
                    .attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px")
                    .html(d.properties.name + indexStrValue);

            })
            .on("mouseout",  function(d,i) {
                tooltip.classed("hidden", true);
            });
    }

    function redraw() {
        width = document.getElementById('container').offsetWidth;
        height = width / 2;
        d3.select('svg').remove();
        setup(width,height);
        draw(topo);
        move();//zoom: scale,translate to this right position.
    }

    function move() {

        if(d3.event) {
            evtTrans = d3.event.translate;
            evtScale = d3.event.scale;
        }
        if(!evtTrans){return;}

        var h = height/4;

        evtTrans[0] = Math.min(
            (width/height)  * (evtScale - 1),
            Math.max( width * (1 - evtScale), evtTrans[0] )
        );

        evtTrans[1] = Math.min(
            h * (evtScale - 1) + h * evtScale,
            Math.max(height  * (1 - evtScale) - h * evtScale, evtTrans[1])
        );

        zoom.translate(evtTrans);
        g.attr("transform", "translate(" + evtTrans + ")scale(" + evtScale + ")");

        //adjust the country hover stroke width based on zoom level
        d3.selectAll(".country").style("stroke-width", 1.5 / evtScale);

    }

    var throttleTimer;
    function throttle() {
        window.clearTimeout(throttleTimer);
        throttleTimer = window.setTimeout(function() {
            redraw();
        }, 200);
    }

    //geo translation on mouse click in map
    function click() {
        var latlon = projection.invert(d3.mouse(this));
        console.log(latlon);
    }

//function to add points and text to the map (used in plotting capitals)
//    function addpoint(lat,lon,text) {
//        var gpoint = g.append("g").attr("class", "gpoint");
//        var x = projection([lat,lon])[0];
//        var y = projection([lat,lon])[1];
//        gpoint.append("svg:circle")
//            .attr("cx", x)
//            .attr("cy", y)
//            .attr("class","point")
//            .attr("r", 1.5);
//        //conditional in case a point has no associated text
//        if(text.length>0){
//
//            gpoint.append("text")
//                .attr("x", x+2)
//                .attr("y", y+2)
//                .attr("class","text")
//                .text(text);
//        }
//
//    }

}());
