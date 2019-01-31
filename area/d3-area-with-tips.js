"use strict";

$(document).ready(function() {
  /******************************************************* Declare variables *******************************************************/

  // Data variables
  const SVG_ID = "#d3-area"; // ID of SVG element
  const DATA_MESSAGE = [
    ["03/01/2018", 0],
    ["04/01/2018", 0.05],
    ["05/01/2018", 0.05],
    ["06/01/2018", 0.1],
    ["07/01/2018", 0.1],
    ["08/01/2018", 0.15],
    ["09/01/2018", 0.2],
    ["10/01/2018", 0.3],
    ["11/01/2018", 0.35],
    ["12/01/2018", 0.45],
    ["01/01/2019", 0.5]
  ]; // Data message
  const POINT_DELAYS = [0]; // Array of delay lengths for each data point based on path length up to that point

  // Static dimension variables
  const ANIMATION_TRANS_TIME = 5000;
  const HOVER_TRANS_TIME = 100; //
  const EDGE_PADDING = 5; // Padding around exterior of chart
  const CIRCLE_MAX_RADIUS = 16;
  const CIRCLE_MIN_RADIUS = 8;

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
  const DATE_FORMAT = d3.timeFormat("%m/%d/%Y");
  const TIME_PARSE = d3.timeParse("%m/%d/%Y");
  let SVG; // SVG selection
  let TIP; // Tooltip generator
  let DEFS; // SVG defs
  let CLIP_PATH; // Clip path to animate area being drawn
  let X_SCALE; // Time scale for dates
  let Y_SCALE; // Linear scale for totals
  let G_CLIP; // Clipped elements group selection
  let G_CHART_AREA; // Chart area group selection
  let AREA; // Area genereator
  let ANIMATING = true; // Boolean to prevent tooltips during animation

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
    // Parse times into js dates
    for (let i = 0; i < DATA_MESSAGE.length; i++) {
      DATA_MESSAGE[i].push(TIME_PARSE(DATA_MESSAGE[i][0]));
    }

    // Select svg
    SVG = d3
      .select(SVG_ID)
      .each(initializeTips)
      .on("touchstart click", function() {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Skip animation, or unfocus unfocus points
        if (ANIMATING) {
          resize();
        } else {
          unfocusPoints();
        }
      });

    // Determine dimensions
    CHART_WIDTH = SVG_WIDTH - 2 * EDGE_PADDING - 2 * CIRCLE_MAX_RADIUS;
    CHART_HEIGHT = SVG_HEIGHT - 2 * EDGE_PADDING - 2 * CIRCLE_MAX_RADIUS;

    // Append defs
    DEFS = SVG.append("defs");

    // Append clipPath
    CLIP_PATH = DEFS.append("clipPath").attr("id", "d3-area-clip");

    // Append clip path rect
    CLIP_PATH.append("rect")
      .attr("x", EDGE_PADDING)
      .attr("y", EDGE_PADDING)
      .attr("width", 0)
      .attr("height", SVG_HEIGHT - 2 * EDGE_PADDING);

    // Initialize scales
    X_SCALE = d3
      .scaleTime()
      .domain(
        d3.extent(DATA_MESSAGE, function(d) {
          return d[2];
        })
      )
      .rangeRound([0, CHART_WIDTH]);

    Y_SCALE = d3
      .scaleLinear()
      .rangeRound([CHART_HEIGHT, 0])
      .domain([
        0,
        d3.max(DATA_MESSAGE, function(d) {
          return d[1];
        })
      ]);

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
          (EDGE_PADDING + CIRCLE_MAX_RADIUS) +
          ", " +
          (EDGE_PADDING + CIRCLE_MAX_RADIUS) +
          ")"
      )
      .on("mouseout", function() {
        console.log("mouseout");
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Unfocus points
        unfocusPoints();
      });

    // Create area generator
    AREA = d3
      .area()
      .x(function(d) {
        return X_SCALE(d[2]);
      })
      .y0(function(d) {
        return CHART_HEIGHT;
      })
      .y1(function(d) {
        return Y_SCALE(d[1]);
      })
      .curve(d3.curveMonotoneX);

    // Append area
    G_CHART_AREA.append("path")
      .datum(DATA_MESSAGE)
      .classed("data-area", true)
      .attr("d", AREA);

    // Append top line
    G_CHART_AREA.append("path")
      .datum(DATA_MESSAGE)
      .classed("data-line", true)
      .attr("d", AREA.lineY1());

    // Append data points
    G_CHART_AREA.selectAll(".data-point")
      .data(DATA_MESSAGE)
      .enter()
      .append("circle")
      .classed("data-point", true)
      .attr("id", function(d, i) {
        return "data-point-" + i;
      })
      .attr("r", CIRCLE_MIN_RADIUS)
      .attr("cx", function(d) {
        return X_SCALE(d[2]);
      })
      .attr("cy", function(d) {
        return Y_SCALE(d[1]);
      });

    // Append data rects
    G_CHART_AREA.selectAll(".data-rect")
      .data(DATA_MESSAGE)
      .enter()
      .append("rect")
      .classed("data-rect", true)
      .attr("id", function(d, i) {
        return "data-rect-" + i;
      })
      .attr("x", function(d, i) {
        if (i == 0) {
          return -CIRCLE_MAX_RADIUS;
        } else {
          return (X_SCALE(DATA_MESSAGE[i - 1][2]) + X_SCALE(d[2])) / 2;
        }
      })
      .attr("y", function(d, i) {
        if (i == DATA_MESSAGE.length - 1) {
          return Y_SCALE(d[1]) - CIRCLE_MAX_RADIUS;
        } else {
          return (
            (Y_SCALE(d[1]) + Y_SCALE(DATA_MESSAGE[i + 1][1])) / 2 -
            CIRCLE_MAX_RADIUS
          );
        }
      })
      .attr("width", function(d, i) {
        if (i == 0) {
          return (
            (X_SCALE(DATA_MESSAGE[i + 1][2]) - X_SCALE(d[2])) / 2 +
            CIRCLE_MAX_RADIUS
          );
        } else if (i == DATA_MESSAGE.length - 1) {
          return (
            (X_SCALE(d[2]) - X_SCALE(DATA_MESSAGE[i - 1][2])) / 2 +
            CIRCLE_MAX_RADIUS
          );
        } else {
          return (
            (X_SCALE(DATA_MESSAGE[i + 1][2]) -
              X_SCALE(DATA_MESSAGE[i - 1][2])) /
            2
          );
        }
      })
      .attr("height", function(d, i) {
        if (i == DATA_MESSAGE.length - 1) {
          return CHART_HEIGHT + 2 * CIRCLE_MAX_RADIUS;
        } else {
          return (
            CHART_HEIGHT +
            2 * CIRCLE_MAX_RADIUS -
            (Y_SCALE(d[1]) + Y_SCALE(DATA_MESSAGE[i + 1][1])) / 2
          );
        }
      })
      .each(function(d, i) {
        this.d = d;
        this.i = i;
      })
      .on("touchstart mouseover", function(d, i) {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Prevent tooltips during animation
        if (ANIMATING) {
          return;
        }

        // Focus point corresponding to this rect
        focusPoint(d, i);
      })
      .on("touchmove", function() {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Get rect corresponding to touch coordinates
        const touch = d3.event.touches[0];
        const touchedRect = document.elementFromPoint(touch.pageX, touch.pageY);
        const point = d3.select("#data-point-" + touchedRect.i);

        // Focus point if on rect and not currently focusing corresponding point
        if (touchedRect.d && !point.classed("focused")) {
          focusPoint(touchedRect.d, touchedRect.i);
        }
      })
      .on("click", function() {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();
      });
  }

  // Resize chart elements
  function resize() {
    // Interupt animation
    ANIMATING = false;
    SVG.selectAll("*").interrupt();
    G_CHART_AREA.selectAll(".data-point").interrupt("grow");

    // Hide tooltip
    TIP.hide();

    // Determine dimensions
    SVG_WIDTH = $(SVG_ID).width();
    SVG_HEIGHT = $(SVG_ID).height();
    CHART_WIDTH = SVG_WIDTH - 2 * EDGE_PADDING - 2 * CIRCLE_MAX_RADIUS;
    CHART_HEIGHT = SVG_HEIGHT - 2 * EDGE_PADDING - 2 * CIRCLE_MAX_RADIUS;

    // Update clip path rect
    CLIP_PATH.select("rect")
      .attr("width", SVG_WIDTH - 2 * EDGE_PADDING)
      .attr("height", SVG_HEIGHT - 2 * EDGE_PADDING);

    // Initialize scales
    X_SCALE = d3
      .scaleTime()
      .domain(
        d3.extent(DATA_MESSAGE, function(d) {
          return d[2];
        })
      )
      .rangeRound([0, CHART_WIDTH]);

    Y_SCALE = d3
      .scaleLinear()
      .rangeRound([CHART_HEIGHT, 0])
      .domain([
        0,
        d3.max(DATA_MESSAGE, function(d) {
          return d[1];
        })
      ]);

    // Create area generator
    AREA = d3
      .area()
      .x(function(d) {
        return X_SCALE(d[2]);
      })
      .y0(function(d) {
        return CHART_HEIGHT;
      })
      .y1(function(d) {
        return Y_SCALE(d[1]);
      })
      .curve(d3.curveMonotoneX);

    // Update area
    G_CHART_AREA.select(".data-area").attr("d", AREA);

    // Update top line
    G_CHART_AREA.select(".data-line").attr("d", AREA.lineY1());

    // Update data points
    G_CHART_AREA.selectAll(".data-point")
      .classed("focused", false)
      .attr("cx", function(d) {
        return X_SCALE(d[2]);
      })
      .attr("cy", function(d) {
        return Y_SCALE(d[1]);
      })
      .attr("r", CIRCLE_MIN_RADIUS);

    // Update data rects
    G_CHART_AREA.selectAll(".data-rect")
      .attr("x", function(d, i) {
        if (i == 0) {
          return -CIRCLE_MAX_RADIUS;
        } else {
          return (X_SCALE(DATA_MESSAGE[i - 1][2]) + X_SCALE(d[2])) / 2;
        }
      })
      .attr("y", function(d, i) {
        if (i == DATA_MESSAGE.length - 1) {
          return Y_SCALE(d[1]) - CIRCLE_MAX_RADIUS;
        } else {
          return (
            (Y_SCALE(d[1]) + Y_SCALE(DATA_MESSAGE[i + 1][1])) / 2 -
            CIRCLE_MAX_RADIUS
          );
        }
      })
      .attr("width", function(d, i) {
        if (i == 0) {
          return (
            (X_SCALE(DATA_MESSAGE[i + 1][2]) - X_SCALE(d[2])) / 2 +
            CIRCLE_MAX_RADIUS
          );
        } else if (i == DATA_MESSAGE.length - 1) {
          return (
            (X_SCALE(d[2]) - X_SCALE(DATA_MESSAGE[i - 1][2])) / 2 +
            CIRCLE_MAX_RADIUS
          );
        } else {
          return (
            (X_SCALE(DATA_MESSAGE[i + 1][2]) -
              X_SCALE(DATA_MESSAGE[i - 1][2])) /
            2
          );
        }
      })
      .attr("height", function(d, i) {
        if (i == DATA_MESSAGE.length - 1) {
          return CHART_HEIGHT + 2 * CIRCLE_MAX_RADIUS;
        } else {
          return (
            CHART_HEIGHT +
            2 * CIRCLE_MAX_RADIUS -
            (Y_SCALE(d[1]) + Y_SCALE(DATA_MESSAGE[i + 1][1])) / 2
          );
        }
      });
  }

  // Animate area being drawn
  function animate() {
    const dataPointTransTime = ANIMATION_TRANS_TIME / DATA_MESSAGE.length;
    const halfDataPointTransTime = 0.5 * dataPointTransTime;
    const dataLinePath = d3.select(".data-line").node();

    // Determine delays for each data point based on path length
    const points = [DATA_MESSAGE[0]];
    for (let i = 1; i < DATA_MESSAGE.length; i++) {
      points.push(DATA_MESSAGE[i]);

      G_CHART_AREA.append("path")
        .datum(points)
        .classed("data-line", true)
        .attr("d", AREA.lineY1())
        .each(function() {
          POINT_DELAYS.push(
            (this.getTotalLength() / dataLinePath.getTotalLength()) *
              ANIMATION_TRANS_TIME
          );

          this.remove();
        });
    }

    // SLide open clip path to reveal chart
    CLIP_PATH.select("rect")
      .transition()
      .ease(d3.easeLinear)
      .duration(ANIMATION_TRANS_TIME)
      .attrTween("width", openAlongX(d3.select(".data-line").node()));

    // Grow and shrink data points as they are passed
    G_CHART_AREA.selectAll(".data-point")
      .transition("grow")
      .duration(halfDataPointTransTime)
      .delay(function(d, i) {
        return POINT_DELAYS[i];
      })
      .attr("r", CIRCLE_MAX_RADIUS);

    G_CHART_AREA.selectAll(".data-point")
      .transition("shrink")
      .duration(halfDataPointTransTime)
      .delay(function(d, i) {
        return POINT_DELAYS[i] + halfDataPointTransTime;
      })
      .attr("r", CIRCLE_MIN_RADIUS);

    // Add tooltip tracker
    G_CHART_AREA.append("circle")
      .attr("id", "tooltip-tracker")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1);

    // Move tooltip tracker
    G_CHART_AREA.select("#tooltip-tracker")
      .transition()
      .ease(d3.easeLinear)
      .duration(ANIMATION_TRANS_TIME)
      .delay(halfDataPointTransTime)
      .attrTween("transform", translateAlong(dataLinePath))
      .on("end", function() {
        d3.select(".d3-tip")
          .transition()
          .duration(dataPointTransTime)
          .style("opacity", 0)
          .on("end", function() {
            ANIMATING = false;
          });
      });
  }

  // Initialize tooltips
  function initializeTips() {
    TIP = d3
      .tip()
      .attr("class", "d3-tip")
      .attr("id", "area-tip")
      .offset([-10, 0])
      .html(function(d) {
        return (
          "<span class='d3-tip-money'> " +
          DOLLAR_FORMAT(d[1]) +
          "</span> <span class='d3-tip-text'> of donations had been uncovered as of <span class='d3-tip-date'>" +
          d[0] +
          "</span>. </span>"
        );
      });

    d3.select(this).call(TIP);
  }

  // Unfocus points and hide tooltip
  function unfocusPoints() {
    // Unmagnify focused point
    G_CHART_AREA.selectAll(".focused")
      .classed("focused", false)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .attr("r", CIRCLE_MIN_RADIUS);

    // Hide tooltip
    TIP.hide();
  }

  // Focus ith point and show tooltip
  function focusPoint(d, i) {
    const point = G_CHART_AREA.select("#data-point-" + i);

    // Unmagnify focused point
    G_CHART_AREA.selectAll(".focused")
      .classed("focused", false)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .attr("r", CIRCLE_MIN_RADIUS);

    // Magnify ith point
    point
      .classed("focused", true)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .attr("r", CIRCLE_MAX_RADIUS);

    // Show tooltip
    TIP.offset([-120, 0]) // use default offset
      .show(d, point.node()) // show with default offset
      .offset(getOffset()) // adjust offset based on position with default offset
      .show(d, point.node()); // show with adjust offset
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

  // Returns an attrTween for translating along the specified path element.
  function translateAlong(path) {
    const l = path.getTotalLength();
    const tooltipTracker = d3.select("#tooltip-tracker").node();

    return function(d, i, a) {
      return function(t) {
        const p = path.getPointAtLength(t * l);

        // Show tooltip
        TIP.offset([-120, 0]) // use default offset
          .show(DATA_MESSAGE[0], tooltipTracker) // show with default offset
          .offset(getOffset()) // adjust offset based on position with default offset
          .show(DATA_MESSAGE[0], tooltipTracker); // show with adjust offset

        d3.select(".d3-tip-date").text(DATE_FORMAT(X_SCALE.invert(p.x)));
        d3.select(".d3-tip-money").text(DOLLAR_FORMAT(Y_SCALE.invert(p.y)));

        return "translate(" + p.x + "," + p.y + ")";
      };
    };
  }

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
