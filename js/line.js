(function(){
    // COPIED FROM MAP.JS

    //local variables.
    var dataFile = "data/ag.lnd.agri.zs_Indicator_en_csv_v2.csv";
    var countryIndices = {};

    //load csv file
    d3.csv(dataFile, function(err, countryIndex) {
        countryIndex.forEach(function(row){
            countryIndices[row["Country Name"]] = row;
        });
        draw("Germany"); /// CHANGE COUNTRY HERE.
    });


    //// ACTUAL CODE STARTS HERE //// /////////////////////////////////////////////////


    var margin = {top: 80, right: 80, bottom: 80, left: 80},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

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
        var svg = d3.select("body").append("svg")
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

}());
