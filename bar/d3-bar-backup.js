"use strict";

$(document).ready(function() {
  /******************************************************* Declare variables *******************************************************/

  // Data variables
  const SVG_ID = "#d3-bar"; // ID of SVG element
  const DATA_MESSAGE = [
    ["End Hunger with Coca-Cola", "./coca cola.png", "#ed1c16", 2, 0.1],
    ["Fight Gender Inequality with Google", "./google.png", "#4285f4", 3, 0.15],
    ["Promote Clean Energy with Amazon", "./google.png", "#ff9900", 4, 0.2],
    ["Build Sustainable Cities with Airbnb", "./google.png", "#fd5c63", 6, 0.3]
  ]; // Data message

  // Static dimension variables
  const HOVER_TRANS_TIME = 250; //
  const EDGE_PADDING = 5; // Padding around exterior of chart
  const NON_HOVER_OPACITY = 0.3; //

  // Dynamic dimension variables
  let SVG_WIDTH = $(SVG_ID).width(); //
  let SVG_HEIGHT = $(SVG_ID).height(); //
  let CHART_WIDTH;
  let CHART_HEIGHT;

  // Selection and d3 variables
  d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
      this.parentNode.appendChild(this);
    });
  }; // Bring element to front of SVG (from https://github.com/wbkd/d3-extended)
  const DOLLAR_FORMAT = d3.format("$.2f"); //
  let SVG; // SVG selection
  let TIP; // Tooltip generator
  let X_SCALE; // Band scale for x categories
  let Y_SCALE; // Linear scale for bar heights
  let G_CHART_AREA; // Chart area group selection
  let G_BARS; //

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

  // Draw bars
  function draw() {
    // Select svg
    SVG = d3
      .select(SVG_ID)
      .each(initializeTips)
      .on("touchstart click", function() {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Unfocus bars
        unfocusBars();
      });

    // Determine dimensions
    CHART_WIDTH = SVG_WIDTH - 2 * EDGE_PADDING;
    CHART_HEIGHT = SVG_HEIGHT - 2 * EDGE_PADDING;

    // Initialize scales
    X_SCALE = d3
      .scaleBand()
      .rangeRound([0, CHART_WIDTH])
      .padding(0.1)
      .domain(
        DATA_MESSAGE.map(function(d) {
          return d[0];
        })
      );

    Y_SCALE = d3
      .scaleLinear()
      .rangeRound([CHART_HEIGHT, 0])
      .domain([
        0,
        d3.max(DATA_MESSAGE, function(d) {
          return d[4];
        })
      ]);

    // Append chart area group
    G_CHART_AREA = SVG.append("g")
      .classed("g-chart-area", true)
      .attr(
        "transform",
        "translate(" + EDGE_PADDING + ", " + EDGE_PADDING + ")"
      );

    // Create data bars group
    G_BARS = G_CHART_AREA.append("g").classed("g-bars", true);

    // Create data arcs
    G_BARS.selectAll(".data-bar")
      .data(DATA_MESSAGE)
      .enter()
      .append("rect")
      .classed("data-bar", true)
      .attr("x", function(d) {
        return X_SCALE(d[0]);
      })
      .attr("y", function(d) {
        return Y_SCALE(d[4]);
      })
      .attr("width", function() {
        return X_SCALE.bandwidth();
      })
      .attr("height", function(d) {
        return CHART_HEIGHT - Y_SCALE(d[4]);
      })
      .attr("fill", function(d) {
        return d[2];
      })
      .on("touchstart click", function(d) {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Unfocus all if clicking focused, else focus clicked
        if (d3.select(this).classed("focused")) {
          unfocusBars();
        } else {
          focusBar(d, this);
        }
      });
  }

  // Resize chart elements
  function resize() {
    // Hide tooltip
    TIP.hide();

    // Determine dimensions
    SVG_WIDTH = $(SVG_ID).width();
    SVG_HEIGHT = $(SVG_ID).height();
    CHART_WIDTH = SVG_WIDTH - 2 * EDGE_PADDING;
    CHART_HEIGHT = SVG_HEIGHT - 2 * EDGE_PADDING;

    // Update scales
    X_SCALE = d3
      .scaleBand()
      .rangeRound([0, CHART_WIDTH])
      .padding(0.1)
      .domain(
        DATA_MESSAGE.map(function(d) {
          return d[0];
        })
      );

    Y_SCALE = d3
      .scaleLinear()
      .rangeRound([CHART_HEIGHT, 0])
      .domain([
        0,
        d3.max(DATA_MESSAGE, function(d) {
          return d[4];
        })
      ]);

    // Update data arcs
    G_BARS.selectAll(".data-bar")
      .classed("focused", false)
      .attr("x", function(d) {
        return X_SCALE(d[0]);
      })
      .attr("y", function(d) {
        return Y_SCALE(d[4]);
      })
      .attr("width", function() {
        return X_SCALE.bandwidth();
      })
      .attr("height", function(d) {
        return CHART_HEIGHT - Y_SCALE(d[4]);
      })
      .style("opacity", 1);
  }

  // Initialize tooltips
  function initializeTips() {
    TIP = d3
      .tip()
      .attr("class", "d3-tip")
      .offset([-10, 0])
      .html(function(d) {
        return (
          "<table> <tr> <td class='d3-tip-header'> " +
          d[0] +
          "</td> </tr> <tr> <td> <span class='d3-tip-money'> " +
          DOLLAR_FORMAT(d[4]) +
          "</span> <span class='d3-tip-text'> has been earned towards this campaign over " +
          d[3] +
          " donations. </span> </td> </tr> </table>"
        );
      });

    d3.select(this).call(TIP);
  }

  // Unfocus all bars and hide tooltip
  function unfocusBars() {
    // Unmagnify focused point
    G_BARS.selectAll(".data-bar")
      .classed("focused", false)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .style("opacity", 1);

    // Hide tooltip
    TIP.hide();
  }

  // Focus given bar and show tooltip
  function focusBar(nodeD, node) {
    // Unfocus other bars
    G_BARS.selectAll(".data-bar")
      .filter(function(d) {
        return d[0] != nodeD[0];
      })
      .classed("focused", false)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .style("opacity", NON_HOVER_OPACITY);

    // Focus this bar
    d3.select(node)
      .classed("focused", true)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .style("opacity", 1);

    // Show tooltip
    TIP.offset([-120, 0]) // use default offset
      .show(nodeD, node) // show with default offset
      .offset(getOffset()) // adjust offset based on position with default offset
      .show(nodeD, node); // show with adjust offset
  }

  // Determine offset for tooltip
  function getOffset() {
    const tip = d3.select(".d3-tip").node();
    const w = tip.clientWidth;
    const h = tip.clientHeight;
    const left = tip.offsetLeft;
    const top = tip.offsetTop;
    let topOffset = -120;
    let leftOffset = 0;

    if (top < EDGE_PADDING) {
      topOffset = topOffset - top + EDGE_PADDING;
    }

    if (left < EDGE_PADDING) {
      leftOffset = -left + EDGE_PADDING;
    } else if (left + w + EDGE_PADDING > window.innerWidth) {
      leftOffset = window.innerWidth - left - w - EDGE_PADDING;
    }

    return [topOffset, leftOffset];
  }

  draw();
});
