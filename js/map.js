(function(){
    var year = "2010";
    //var dataFile = "data/ag.lnd.agri.zs_Indicator_en_csv_v2.csv";
    var dataFile = "data/SP.URB.TOTL.IN.ZS_Indicator_en_csv_v2.csv";
    var countryIndices = {};
    var evtScale, evtTrans;
    var fillRange;
    var mouseHoverOverCountry;

    //load csv file
    var loadData = function(redrawAfterLoading) {
        d3.csv(dataFile, function (err, countryIndex) {

            var minScale, maxScale, minYear = 1960, maxYear = 2012, ix;

            countryIndex.forEach(function (row) {
                countryIndices[row["Country Name"]] = row;

                for (ix = minYear; ix < maxYear; ix++) {
                    var newVal = parseFloat(row[ix.toString()]);
                    if (isNaN(newVal)) {
                        continue;
                    }
                    if (!minScale) {
                        minScale = newVal;
                        maxScale = minScale;
                    }
                    minScale = Math.min(minScale, newVal);
                    maxScale = Math.max(maxScale, newVal);
                }
            });


            fillRange = d3.scale.linear()
                .domain([minScale, maxScale])
                .range(["cyan", "steelblue"]);
            if(redrawAfterLoading){
                redraw();
            }
        });
    };
    loadData(false);
    //upon data selection change -reload the data.
    $("#urbpop, #agrlnd, #health").change(function () {
        if ($(this).val() === "urbpop") {
            dataFile = "data/SP.URB.TOTL.IN.ZS_Indicator_en_csv_v2.csv";

        }else if ($(this).val() === "agrlnd") {
            dataFile = "data/ag.lnd.agri.zs_Indicator_en_csv_v2.csv";
        }else if ($(this).val() === "health") {
            dataFile = "data/sh.xpd.totl.zs_Indicator_en_csv_v2.csv";
        }else{
            return;
        }
        loadData(true);
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
    function draw(countries) {

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
                mouseHoverOverCountry = d;
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
                mouseHoverOverCountry = undefined;
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
        //var latlon = projection.invert(d3.mouse(this));
        //console.log(latlon);
        if(mouseHoverOverCountry) {
            //drawChart("Germany");
            drawChart(mouseHoverOverCountry.properties.name)
        }


    }



//__start chart code
function drawChart(countryName){
    $("#myModalLabel").text(countryName);
    $("#countryChart" ).empty();
    var margin = {top: 80, right: 80, bottom: 80, left: 80},
        width = 550 - margin.left - margin.right,
        height = 360 - margin.top - margin.bottom;

    var bisectDate = d3.bisector(function(d) { return d.year; }).left,
        formatValue = d3.format(".2f");

    // Scales and axes. Note the inverted domain for the y-scale: bigger is up!
    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .tickSize(-height)
        .tickFormat(function(d) {return d;}) // Needed to remove the decimal separator (eg. 2001 would become 2,001 otherwise)
        .tickSubdivide(false);

    var yAxis = d3.svg.axis()
        .scale(y)
        .ticks(4)
        .orient("right");

    // An area generator, for the light fill.
    var area = d3.svg.area()
        .interpolate("monotone")
        .x(function(d) { return x(d.year); })
        .y0(height)
        .y1(function(d) { return y(d.value); });

    // A line generator, for the dark stroke.
    var line = d3.svg.line()
        .interpolate("monotone")
        .x(function(d) { return x(d.year); })
        .y(function(d) { return y(d.value); });

    /**
     * Main function to draw the graph
     */
    function draw(country) {
        var values = loadCountry(country);

        // Compute the minimum and maximum date, and the maximum price.
        x.domain([1960,2011]);
        y.domain([0, d3.max(values, function(d) { return d.value; })]).nice();

        // Add an SVG element with the desired dimensions and margin.
        var svg = d3.select("#countryChart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

        // Add the clip path.
        svg.append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        // Add the area path.
        svg.append("path")
            .attr("class", "area")
            .attr("clip-path", "url(#clip)")
            .attr("d", area(values));

        // Add the x-axis.
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // Add the y-axis.
        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + width + ",0)")
            .call(yAxis);

        // Add the line path.
        svg.append("path")
            .attr("class", "line")
            .attr("clip-path", "url(#clip)")
            .attr("d", line(values));

        // Add a small label for the symbol name.
        svg.append("text")
            .attr("x", width - 6)
            .attr("y", height - 6)
            .style("text-anchor", "end")
            .text(country);

        //// Hover over
        var focus = svg.append("g")
            .attr("class", "focus")
            .style("display", "none");

        focus.append("circle")
            .attr("r", 4.5);

        focus.append("text")
            .attr("x", 9)
            .attr("dy", ".35em");

        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height)
            .on("mouseover", function() { focus.style("display", null); })
            .on("mouseout", function() { focus.style("display", "none"); })
            .on("mousemove", mousemove);

        /**
         * Function that repositions the hover over circle.
         */
        function mousemove() {
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(values, x0, 1), // Find the year in the values array
                d0 = values[i - 1],
                d1 = values[i],
                d = x0 - d0.year > d1.year - x0 ? d1 : d0;
            focus.attr("transform", "translate(" + x(d.year) + "," + y(d.value) + ")"); // Position the circle
            focus.select("text").text(d.year + ': ' + formatValue(d.value)); // Add some text next to the circle
        }

    }

    /**
     * Loads the data for a specific country in an array of the correct format.
     */
    function loadCountry(country) {
        var ret = [];

        for (var key in countryIndices[country]) {
            if(!isNaN(parseInt(key))) {
                var val = parseFloat(countryIndices[country][key]);
                if(isNaN(val)) {
                    val = 0;
                }
                ret.push({'year':parseInt(key),'value':val});
            }
        }

        return ret;
    }

    /**
     * Format the value as a positive number
     */
    function type(d) {
        d.value = +d.value;
        return d;
    }
    draw(countryName);

    $('#myModal').modal('show');
    $('#myModal').on( 'keydown', function(event) {
        if(event.which == 13){
            $('#myModal').modal('hide');
        }
    });



}
//__end chart code

}());
