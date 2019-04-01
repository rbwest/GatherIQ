"use strict";

$(document).ready(function() {
  /******************************************************* Declare variables *******************************************************/

  // Data variables
  const SVG_ID = "#d3-line"; // ID of SVG element
  const DATA = [
    // [1820, 0.944],
    // [1850, 0.925],
    // [1870, 0.896],
    // [1890, 0.857],
    // [1910, 0.824],
    // [1929, 0.759],
    // [1950, 0.719],
    // [1960, 0.643],
    // [1970, 0.601],
    [1981, 0.4396],
    [1984, 0.4084],
    [1987, 0.3696],
    [1990, 0.3691],
    [1993, 0.3479],
    [1996, 0.2978],
    [1999, 0.2908],
    [2002, 0.2629],
    [2005, 0.2092],
    [2008, 0.1865],
    [2010, 0.1627],
    [2011, 0.1412],
    [2012, 0.1273],
    [2015, 0.096]
  ]; // Data message
  const CALLOUTS = [[1996, 0.3], [2015, 0.1]];
  const POINT_DELAYS = [0]; // Array of delay lengths for each data point based on path length up to that point
  const Y_MIN = 0;
  const Y_MAX = 0.5;
  const X_MIN = 1980;
  const X_MAX = 2017;
  const START_COLOR = "#852778";
  const END_COLOR = "#415DAB";
  const START_COLOR_LIGHT = d3
    .color(START_COLOR)
    .brighter(1)
    .hex();
  const END_COLOR_LIGHT = d3
    .color(END_COLOR)
    .brighter(1)
    .hex();

  // Static dimension variables
  const ANIMATION_TRANS_TIME = 8000;
  const HOVER_TRANS_TIME = 100; //
  const EDGE_PADDING = 5; // Padding around exterior of chart
  const CIRCLE_MAX_RADIUS = 8;
  const CIRCLE_MIN_RADIUS = 3;
  const CALLOUT_RADIUS = 6;
  const VERT_PAD = 5; // Vertical padding between elements
  const Y_AXIS_PAD = 2; // Padding between y-axis and chart area
  const X_TICK_PAD = 10; // Padding between x tick labels to help space them out
  const CALLOUT_VERT_OFFSET = 10;

  // Dynamic dimension variables
  let SVG_WIDTH = $(SVG_ID).width(); //
  let SVG_HEIGHT = $(SVG_ID).height(); //
  let CHART_WIDTH;
  let CHART_HEIGHT;
  let Y_AXIS_WIDTH; // Width of y-axis
  let X_AXIS_HEIGHT; // Height of x-axis
  let X_LABEL_HEIGHT; // Height of x-axis label
  let Y_LABEL_HEIGHT; // Height of y-axis label
  let Y_TICK_HEIGHT; // Height of individual y-axis tick
  let X_TICK_MAX_WIDTH = 10; // Maximum width alocated to individual x-axis tick

  // Selection and d3 variables
  d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
      this.parentNode.appendChild(this);
    });
  }; // Bring element to front of SVG (from https://github.com/wbkd/d3-extended)
  const PERCENT_FORMAT = d3.format(".1%"); //
  const PERCENT_FORMAT_SHORT = d3.format(".0%"); //
  const DATE_FORMAT = d3.timeFormat("%Y");
  const TIME_PARSE = d3.timeParse("%Y");
  let SVG; // SVG selection
  let DEFS; // SVG defs
  let CLIP_PATH; // Clip path to animate area being drawn
  let X_SCALE; // Time scale for dates
  let Y_SCALE; // Linear scale for totals
  let X_LABEL; // X label data-join
  let Y_LABEL; // Y label data-join
  let X_AXIS; // X axis group data-join
  let Y_AXIS; // Y axis group data join
  let G_CLIP; // Clipped elements group selection
  let G_CHART_AREA; // Chart area group selection
  let AREA; // Area genereator
  let ANIMATING = true; // Boolean to specify if animation is running

  /*************************************************** Setup Callback Functions ***************************************************/

  // Attach event for data message from VA
  // va.messagingUtil.setOnDataReceivedCallback(onDataReceived);

  // If not being rendered in iFrame (outside VA), render with sample data
  // if (!inIframe()) {
  //   onDataReceived(SAMPLE_MESSAGE);
  // }

  // Listen for resize event
  va.contentUtil.setupResizeListener(resize);

  /******************************************************* Render functions *******************************************************/

  // Draw area chart
  function draw() {
    // Select svg
    SVG = d3.select(SVG_ID).on("touchstart click", function() {
      // Prevent event from falling through to underlying elements or causing scroll
      d3.event.stopPropagation();
      d3.event.preventDefault();

      // Skip animation, or unfocus unfocus points
      if (ANIMATING) {
        resize();
      }
    });

    // Use fake scales to determine axes dimensions
    calculateAxesDimensions();

    // Create x axis label
    X_LABEL = SVG.selectAll(".x-label").data([DATA]);

    X_LABEL.enter()
      .append("text")
      .classed("x-label", true)
      .text("Year")
      .each(function() {
        X_LABEL_HEIGHT = this.getBBox().height;
      })
      .merge(X_LABEL)
      .attr("x", SVG_WIDTH / 2)
      .attr("y", SVG_HEIGHT);

    // Create y axis label
    Y_LABEL = SVG.selectAll(".y-label").data([DATA]);

    Y_LABEL.enter()
      .append("text")
      .classed("y-label", true)
      .text("Percent of World Population in Extreme Poverty")
      .each(function() {
        Y_LABEL_HEIGHT = this.getBBox().height;
      });

    // Init scales with dynamic dimensions
    createDynamicScales();

    // Create x axis
    X_AXIS = SVG.selectAll(".x-axis").data([DATA]);

    X_AXIS.enter()
      .append("g")
      .classed("x-axis", true)
      .merge(X_AXIS)
      .attr(
        "transform",
        "translate(" +
          Y_AXIS_WIDTH +
          "," +
          (Y_LABEL_HEIGHT + VERT_PAD + CHART_HEIGHT) +
          ")"
      )
      .call(
        d3
          .axisBottom(X_SCALE)
          .tickValues([1981, 1996, 2015])
          .tickFormat(d3.format("d"))
          .tickSizeOuter(0)
      );

    // Create y axis
    Y_AXIS = SVG.selectAll(".y-axis").data([DATA]);

    Y_AXIS.enter()
      .append("g")
      .classed("y-axis", true)
      .attr(
        "transform",
        "translate(" + Y_AXIS_WIDTH + "," + (Y_LABEL_HEIGHT + VERT_PAD) + ")"
      )
      .merge(Y_AXIS)
      .call(
        d3
          .axisLeft(Y_SCALE)
          .tickValues([0, 0.15, 0.3, 0.45])
          .tickFormat(PERCENT_FORMAT_SHORT)
          .tickSizeOuter(0)
      );

    // Append defs
    DEFS = SVG.append("defs");

    // Append clipPath
    CLIP_PATH = DEFS.append("clipPath").attr("id", "d3-area-clip");

    // Append clip path rect
    CLIP_PATH.append("rect")
      .attr("x", Y_AXIS_WIDTH + Y_AXIS_PAD)
      .attr("y", Y_LABEL_HEIGHT + VERT_PAD)
      .attr("width", 0)
      .attr("height", CHART_HEIGHT);

    // Append gradients
    DEFS.append("linearGradient")
      .attr("id", "path-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "50%")
      .attr("y2", "50%")
      .each(function() {
        // Append color stops
        d3.select(this)
          .append("stop")
          .attr("class", "start")
          .attr("offset", "0%")
          .attr("stop-color", START_COLOR)
          .attr("stop-opacity", 1);

        d3.select(this)
          .append("stop")
          .attr("class", "end")
          .attr("offset", "100%")
          .attr("stop-color", END_COLOR)
          .attr("stop-opacity", 1);
      });

    DEFS.append("linearGradient")
      .attr("id", "path-gradient-light")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "50%")
      .attr("y2", "50%")
      .each(function() {
        // Append color stops
        d3.select(this)
          .append("stop")
          .attr("class", "start")
          .attr("offset", "0%")
          .attr("stop-color", START_COLOR_LIGHT)
          .attr("stop-opacity", 1);

        d3.select(this)
          .append("stop")
          .attr("class", "end")
          .attr("offset", "100%")
          .attr("stop-color", END_COLOR_LIGHT)
          .attr("stop-opacity", 1);
      });

    // Append G_CLIP and save references
    G_CLIP = SVG.append("g")
      .classed("g-clip", true)
      .attr("clip-path", "url(#d3-area-clip)");

    // Append chart area group
    G_CHART_AREA = G_CLIP.append("g")
      .classed("g-chart-area", true)
      .attr(
        "transform",
        "translate(" +
          (Y_AXIS_WIDTH + Y_AXIS_PAD) +
          ", " +
          (Y_LABEL_HEIGHT + VERT_PAD) +
          ")"
      );

    // Create area generator
    AREA = d3
      .area()
      .x(function(d) {
        return X_SCALE(d[0]);
      })
      .y0(function(d) {
        return CHART_HEIGHT;
      })
      .y1(function(d) {
        return Y_SCALE(d[1]);
      })
      .curve(d3.curveMonotoneX);

    // Append top line
    G_CHART_AREA.append("path")
      .datum(DATA)
      .classed("data-line", true)
      .attr("stroke", "url(#path-gradient-light)")
      .attr("d", AREA.lineY1());

    // Append area
    G_CHART_AREA.append("path")
      .datum(DATA)
      .classed("data-area", true)
      .attr("fill", "url(#path-gradient)")
      .attr("d", AREA);

    // Append data points
    G_CHART_AREA.selectAll(".data-point")
      .data(DATA)
      .enter()
      .append("circle")
      .classed("data-point", true)
      .attr("id", function(d, i) {
        return "data-point-" + i;
      })
      .attr("r", 0)
      .attr("cx", function(d) {
        return X_SCALE(d[0]);
      })
      .attr("cy", function(d) {
        return Y_SCALE(d[1]);
      })
      .attr("fill", function(d) {
        const domain = X_SCALE.domain();

        return d3.interpolate(
          START_COLOR_LIGHT,
          END_COLOR_LIGHT
        )((d[0] - domain[0]) / (domain[1] - domain[0]));
      });

    // Append callouts
    SVG.selectAll(".data-callout")
      .data(CALLOUTS)
      .enter()
      .append("text")
      .classed("data-callout", true)
      .text(function(d) {
        return PERCENT_FORMAT_SHORT(d[1]);
      })
      .attr("fill", function(d) {
        const domain = X_SCALE.domain();

        return d3.interpolate(
          START_COLOR_LIGHT,
          END_COLOR_LIGHT
        )((d[0] - domain[0]) / (domain[1] - domain[0]));
      })
      .attr("x", function(d) {
        return Y_AXIS_WIDTH + Y_AXIS_PAD + X_SCALE(d[0]);
      })
      .attr("y", function(d) {
        return Y_LABEL_HEIGHT + VERT_PAD + Y_SCALE(d[1]) - CALLOUT_VERT_OFFSET;
      })
      .style("opacity", 0);
  }

  // Resize chart elements
  function resize() {
    // Interupt animation
    ANIMATING = false;
    SVG.selectAll("*").interrupt();
    G_CHART_AREA.selectAll(".data-point").interrupt("grow");

    // Determine dimensions
    SVG_WIDTH = $(SVG_ID).width();
    SVG_HEIGHT = $(SVG_ID).height();

    // Update x label position
    SVG.select(".x-label")
      .attr("x", SVG_WIDTH / 2)
      .attr("y", SVG_HEIGHT);

    // Update scales
    createDynamicScales();

    // Update x axis
    SVG.select(".x-axis")
      .attr(
        "transform",
        "translate(" +
          Y_AXIS_WIDTH +
          "," +
          (Y_LABEL_HEIGHT + VERT_PAD + CHART_HEIGHT) +
          ")"
      )
      .call(
        d3
          .axisBottom(X_SCALE)
          .tickValues([1981, 1996, 2015])
          .tickFormat(d3.format("d"))
          .tickSizeOuter(0)
      );

    // Update y axis
    SVG.select(".y-axis")
      .attr(
        "transform",
        "translate(" + Y_AXIS_WIDTH + "," + (Y_LABEL_HEIGHT + VERT_PAD) + ")"
      )
      .call(
        d3
          .axisLeft(Y_SCALE)
          .tickValues([0, 0.15, 0.3, 0.45])
          .tickFormat(PERCENT_FORMAT_SHORT)
          .tickSizeOuter(0)
      );

    // Update clip path rect
    CLIP_PATH.select("rect")
      .attr("width", X_SCALE(X_MAX))
      .attr("height", CHART_HEIGHT);

    // Create area generator
    AREA = d3
      .area()
      .x(function(d) {
        return X_SCALE(d[0]);
      })
      .y0(function(d) {
        return CHART_HEIGHT;
      })
      .y1(function(d) {
        return Y_SCALE(d[1]);
      })
      .curve(d3.curveMonotoneX);

    // Update top line
    G_CHART_AREA.select(".data-line").attr("d", AREA.lineY1());

    // Update area
    G_CHART_AREA.select(".data-area").attr("d", AREA);

    // Update data points
    G_CHART_AREA.selectAll(".data-point")
      .classed("focused", false)
      .attr("cx", function(d) {
        return X_SCALE(d[0]);
      })
      .attr("cy", function(d) {
        return Y_SCALE(d[1]);
      })
      .attr("r", CIRCLE_MIN_RADIUS);

    // Append callouts
    SVG.selectAll(".data-callout")
      .attr("x", function(d) {
        return Y_AXIS_WIDTH + Y_AXIS_PAD + X_SCALE(d[0]);
      })
      .attr("y", function(d) {
        return Y_LABEL_HEIGHT + VERT_PAD + Y_SCALE(d[1]) - CALLOUT_VERT_OFFSET;
      })
      .style("opacity", 1);
  }

  // Animate area being drawn
  function animate() {
    const timePerYear = ANIMATION_TRANS_TIME / (X_MAX - X_MIN + 1);
    // console.log(timePerYear);

    // SLide open clip path to reveal chart
    CLIP_PATH.select("rect")
      .transition()
      .ease(d3.easeLinear)
      .duration(ANIMATION_TRANS_TIME - timePerYear / 2)
      // .attrTween("width", openAlongX(d3.select(".data-line").node()))
      .attr("width", X_SCALE(X_MAX))
      .on("end", function() {
        ANIMATING = false;
      });

    // Grow and shrink data points as they are passed
    G_CHART_AREA.selectAll(".data-point")
      .transition("grow")
      .duration(timePerYear)
      .delay(function(d, i) {
        // console.log(d[0] + " grow delay:" + (d[0] - X_MIN) * timePerYear);
        return (d[0] - X_MIN) * timePerYear;
      })
      .attr("r", CIRCLE_MAX_RADIUS);

    G_CHART_AREA.selectAll(".data-point")
      .transition("shrink")
      .duration(timePerYear)
      .delay(function(d, i) {
        return (d[0] - X_MIN + 1) * timePerYear;
      })
      .attr("r", function(d) {
        if (
          CALLOUTS.find(function(el) {
            return el[0] == d[0];
          })
        ) {
          return CALLOUT_RADIUS;
        } else {
          return CIRCLE_MIN_RADIUS;
        }
      });

    // Fade in callouts
    SVG.selectAll(".data-callout")
      .transition()
      .duration(timePerYear)
      .delay(function(d, i) {
        return (d[0] - X_MIN + 1) * timePerYear;
      })
      .style("opacity", 1);
  }

  // Use fake scales to determine axes dimensions
  function calculateAxesDimensions() {
    // Initialize scales with fake ranges
    X_SCALE = d3
      .scaleLinear()
      .domain([X_MAX, X_MAX])
      .rangeRound([0, 1000]);

    Y_SCALE = d3
      .scaleLinear()
      .domain([Y_MAX, Y_MAX])
      .rangeRound([0, 1000]);

    // Use dummy axes with fake scales to obtain dimensions
    SVG.append("g")
      .classed("y-axis", true)
      .call(d3.axisLeft(Y_SCALE).tickFormat(PERCENT_FORMAT_SHORT))
      .each(function() {
        Y_TICK_HEIGHT = d3
          .select(this)
          .select("text")
          .node()
          .getBBox().height;
        Y_AXIS_WIDTH = this.getBBox().width;
        this.remove();
      });

    SVG.append("g")
      .classed("x-axis", true)
      .call(d3.axisBottom(X_SCALE).tickFormat(d3.format("d")))
      .each(function() {
        d3.select(this)
          .selectAll("text")
          .each(function() {
            X_TICK_MAX_WIDTH = Math.max(
              X_TICK_MAX_WIDTH,
              this.getComputedTextLength() + 2 * X_TICK_PAD
            );
          });
        X_AXIS_HEIGHT = this.getBBox().height;
        this.remove();
      });
  }

  // Use maximums and chart dimensions to create dynamic scales
  function createDynamicScales() {
    // Calculate chart dimensions
    CHART_WIDTH = SVG_WIDTH - Y_AXIS_PAD - Y_AXIS_WIDTH;
    CHART_HEIGHT =
      SVG_HEIGHT -
      X_LABEL_HEIGHT -
      VERT_PAD -
      X_AXIS_HEIGHT -
      VERT_PAD -
      Y_LABEL_HEIGHT;

    // Update scales using calculated dimensions
    X_SCALE = d3
      .scaleLinear()
      .domain([X_MIN, X_MAX])
      .rangeRound([0, CHART_WIDTH]);

    Y_SCALE = d3
      .scaleLinear()
      .domain([Y_MIN, Y_MAX])
      .rangeRound([CHART_HEIGHT, 0]);
  }

  // Compute array of readable tick values between min (inclusive) and max (exclusive) of length less than count
  function getTickValues(min, max, count, minInterval) {
    const pattern = [5, 2, 1];
    let tickValues;
    let range = max - min;
    let pow = Math.floor(Math.log10(range));
    let p = 0;
    let interval = pattern[p] * Math.pow(10, pow);

    do {
      tickValues = d3.range(min, max, interval);

      if (p == 2) {
        p = 0;
        pow--;
      } else {
        p++;
      }

      interval = pattern[p] * Math.pow(10, pow);
    } while (d3.range(min, max, interval).length <= count && interval >= minInterval);

    return tickValues;
  }

  // Function to open clip rect along path length
  function openAlongX(path) {
    const l = path.getTotalLength();
    const edge = 2 * CIRCLE_MAX_RADIUS;
    return function(d, i, a) {
      return function(t) {
        const p = path.getPointAtLength(t * l);
        return p.x + t * edge;
      };
    };
  }

  draw();

  animate();
});
