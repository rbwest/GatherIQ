"use strict";

$(document).ready(function() {
  /******************************************************* Declare variables *******************************************************/

  // Data variables
  const SVG_ID = "#d3-donut"; // ID of SVG element
  const DATA_MESSAGE = [
    ["Total", "No Poverty", 1, 0.05],
    ["Total", "Zero Hunger", 3, 0.15],
    ["Total", "Good Health and Well-Being", 1, 0.05],
    ["Total", "Quality Education", 1, 0.05],
    ["Total", "Gender Equality", 2, 0.1],
    ["Total", "Clean Water and Sanitation", 1, 0.05],
    ["Total", "Affordable and Clean Energy", 5, 0.25],
    ["Total", "Decent Work and Economic Growth", 0, 0],
    ["Total", "Industry, Innovation, and Infrastructure", 5, 0.25],
    ["Total", "Reduced Inequalities", 3, 0.15],
    ["Total", "Sustainable Cities and Communities", 3, 0.15],
    ["Total", "Responsible Consumption and Production", 1, 0.05],
    ["Total", "Climate Action", 2, 0.1],
    ["Total", "Life Below Water", 1, 0.05],
    ["Total", "Life On Land", 2, 0.1],
    ["Total", "Peace and Justice Strong Institutions", 4, 0.2],
    ["Total", "Partnerships for the Goals", 1, 0.05],
    ["Pending", "Decent Work and Economic Growth", 5, 0.25],
    ["Pending", "Zero Hunger", 2, 0.1],
    ["Pending", "Good Health and Well-Being", 6, 0.3],
    ["Pending", "Life Below Water", 1, 0.05]
  ]; // Data message totals prior to last view, and donations since last view
  const GOALS = {
    "No Poverty": { color: "#e5243b", index: 1, abrev: "Poverty" },
    "Zero Hunger": { color: "#dda63a", index: 2, abrev: "Hunger" },
    "Good Health and Well-Being": {
      color: "#4c9f38",
      index: 3,
      abrev: "Health"
    },
    "Quality Education": { color: "#c5192d", index: 4, abrev: "Education" },
    "Gender Equality": { color: "#ff3a21", index: 5, abrev: "Gender" },
    "Clean Water and Sanitation": {
      color: "#26bde2",
      index: 6,
      abrev: "Water"
    },
    "Affordable and Clean Energy": {
      color: "#fcc30b",
      index: 7,
      abrev: "energy"
    },
    "Decent Work and Economic Growth": {
      color: "#a21942",
      index: 8,
      abrev: "Work"
    },
    "Industry, Innovation, and Infrastructure": {
      color: "#fd6925",
      index: 9,
      abrev: "Industry"
    },
    "Reduced Inequalities": {
      color: "#dd1367",
      index: 10,
      abrev: "Inequality"
    },
    "Sustainable Cities and Communities": {
      color: "#fd9d24",
      index: 11,
      abrev: "Sustainability"
    },
    "Responsible Consumption and Production": {
      color: "#bf8b2e",
      index: 12,
      abrev: "Consumption"
    },
    "Climate Action": { color: "#3f7e44", index: 13, abrev: "Climate" },
    "Life Below Water": { color: "#0a97d9", index: 14, abrev: "Marine Life" },
    "Life On Land": { color: "#56c02b", index: 15, abrev: "Land Life" },
    "Peace and Justice Strong Institutions": {
      color: "#00689d",
      index: 16,
      abrev: "Justice"
    },
    "Partnerships for the Goals": {
      color: "#19486a",
      index: 17,
      abrev: "Partners"
    }
  }; // Fill colors keyed to categories

  // Static dimension variables
  const HOVER_TRANS_TIME = 250; //
  const EDGE_PADDING = 5; // Padding around exterior of chart
  const PENDING_TEXT_PADDING = 10; //
  const NON_HOVER_OPACITY = 0.3; //
  const RADIUS_MAGNIFICATION_RATIO = 0.05;
  const ANGLE_MAGNIFICATION = 0.1;
  const INNER_RADIUS_RATIO = 0.7;

  // Dynamic dimension variables
  let SVG_WIDTH = $(SVG_ID).width(); //
  let SVG_HEIGHT = $(SVG_ID).height(); //
  let RADIUS; // Radius of pie/donut
  let FOCUS_TRANS_TIME = 1000; // Duration of arc becoming focused
  let DELAY_TIME = 100; // Delay between transition steps
  let DROP_IN_TRANS_TIME = 2500; // Duration of donation being dropped in
  let PENDING_TEXT_HEIGHT;

  // Selection and d3 variables
  d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
      this.parentNode.appendChild(this);
    });
  }; // Bring element to front of SVG (from https://github.com/wbkd/d3-extended)
  const DOLLAR_FORMAT = d3.format("$.2f"); //
  let TOTALS; // Total data extracted from data message
  let PENDING; // Pending data extracted from data message
  let NEW_TOTALS; // Total data with pending data added in
  let SVG; // SVG selection
  let TIP; // Tooltip generator
  let G_CHART_AREA; // Path group selection
  let G_ARCS; // Arc group selection
  let ARC; // Arc generator to create arc paths from arc data
  let MAGNIFIED_ARC; // Arc generator to create magnified arc path
  let PIE; // Pie data generator
  let DATA; // Piefied totals
  let ANIMATING = true; // Boolean to prevent tooltips during animation
  let LAST_TOUCHSTART;

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

  // Draw donut
  function draw() {
    // Extract data from data message
    TOTALS = DATA_MESSAGE.filter(function(d) {
      return d[0] == "Total";
    }).map(function(d, i) {
      return {
        key: d[1],
        id: "arc" + i,
        color: GOALS[d[1]].color,
        index: GOALS[d[1]].index,
        num_donations: d[2],
        value: d[3] + 0.000001
      };
    });

    PENDING = DATA_MESSAGE.filter(function(d) {
      return d[0] == "Pending";
    });

    NEW_TOTALS = [];
    let total;
    for (let i = 0; i < TOTALS.length; i++) {
      total = Object.assign({}, TOTALS[i]);
      for (let j = 0; j < PENDING.length; j++) {
        if (total.key == PENDING[j][1]) {
          total.num_donations += PENDING[j][2];
          total.value += PENDING[j][3];
        }
      }
      NEW_TOTALS.push(total);
    }

    // Select svg
    SVG = d3
      .select(SVG_ID)
      .each(initializeTips)
      .on("touchstart click", function() {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Skip animation, or unfocus unfocus arcs
        if (ANIMATING) {
          resize();
        } else {
          unfocusArcs();
        }
      });

    // Get height of pending donation text
    SVG.append("text")
      .classed("pending-donation-text", true)
      .text("TEXT")
      .each(function() {
        PENDING_TEXT_HEIGHT = this.getBBox().height;
        this.remove();
      });

    // Determine dimensions
    RADIUS =
      Math.min(
        SVG_WIDTH - 2 * EDGE_PADDING,
        SVG_HEIGHT -
          2 * EDGE_PADDING -
          PENDING_TEXT_HEIGHT -
          PENDING_TEXT_PADDING
      ) / 2;

    // Append chart area group
    G_CHART_AREA = SVG.append("g")
      .classed("g-chart-area", true)
      .attr(
        "transform",
        "translate(" +
          SVG_WIDTH / 2 +
          ", " +
          (SVG_HEIGHT - EDGE_PADDING - RADIUS) +
          ")"
      );

    // Append arc group
    G_ARCS = G_CHART_AREA.append("g")
      .classed("g-arcs", true)
      .on("mouseout", function() {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Prevent tooltips during animation
        if (ANIMATING) {
          return;
        }

        // Unfocus arcs
        unfocusArcs();
      });

    // Append circle to bind tooltip to
    SVG.append("circle")
      .attr("id", "tooltip-tracker")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1);

    // Create arc generators
    ARC = d3
      .arc()
      .startAngle(function(d) {
        return d.startAngle;
      })
      .endAngle(function(d) {
        return d.endAngle;
      })
      .innerRadius(function(d) {
        return (
          INNER_RADIUS_RATIO * RADIUS - RADIUS_MAGNIFICATION_RATIO * RADIUS
        );
      })
      .outerRadius(function(d) {
        return RADIUS - RADIUS_MAGNIFICATION_RATIO * RADIUS;
      });

    MAGNIFIED_ARC = d3
      .arc()
      .startAngle(function(d) {
        return d.startAngle - ANGLE_MAGNIFICATION;
      })
      .endAngle(function(d) {
        return d.endAngle + ANGLE_MAGNIFICATION;
      })
      .innerRadius(function(d) {
        return (
          INNER_RADIUS_RATIO * RADIUS - 2 * RADIUS_MAGNIFICATION_RATIO * RADIUS
        );
      })
      .outerRadius(function(d) {
        return RADIUS;
      });

    // Create pie data generator
    PIE = d3
      .pie()
      .sort(null)
      .value(function(d) {
        return d.value;
      });

    // Piefy data
    DATA = PIE(TOTALS);

    // Create data arcs
    G_ARCS.selectAll(".data-arc")
      .data(DATA, function(d) {
        return d.data.key;
      })
      .enter()
      .append("path")
      .attr("id", function(d) {
        this.startAngle = d.startAngle;
        this.endAngle = d.endAngle;
        return d.data.id;
      })
      .classed("data-arc", true)
      .attr("d", ARC)
      .attr("fill", function(d) {
        return d.data.color;
      })
      .on("touchstart mouseover", function(d, i) {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Prevent tooltips during animation
        if (ANIMATING) {
          return;
        }

        // Get currently magnified arc
        const magnifiedArc = d3.select(".focused");
        const magnifiedArcData = magnifiedArc.empty()
          ? null
          : magnifiedArc.datum().data;

        // Update last touchstart
        LAST_TOUCHSTART = {
          moved: false,
          id: d.data.id,
          magnifiedId: magnifiedArcData ? magnifiedArcData.id : null
        };

        // Focus touched arc
        focusArc(d);

        // Move tooltip tracker to touch location
        moveTooltip(d);
      })
      .on("touchmove mousemove", function(d, i) {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Prevent tooltips during animation
        if (ANIMATING || !LAST_TOUCHSTART) {
          return;
        }

        // Update last touchstart
        LAST_TOUCHSTART.moved = true;

        // Get currently hovered arc from touch
        const touch = d3.event.touches ? d3.event.touches[0] : d3.event;
        const hoveredArcData = getTouchedArc(touch);

        // If hovering on an arc, move tooltip tracker and show
        if (hoveredArcData) {
          // Get currently magnified arc
          const magnifiedArc = d3.select(".focused");
          const magnifiedArcData = magnifiedArc.empty()
            ? null
            : magnifiedArc.datum();

          // If moving to new tooltip, focus newly hovered arc
          if (
            !magnifiedArcData ||
            hoveredArcData.data.id != magnifiedArcData.data.id
          ) {
            focusArc(hoveredArcData);
          }

          // Move tooltip tracker to touch location
          moveTooltip(hoveredArcData);
        }
      })
      .on("touchend", function() {
        // Prevent tooltips during animation
        if (ANIMATING || !LAST_TOUCHSTART) {
          return;
        }

        if (
          !LAST_TOUCHSTART.moved && // tap without drag &&
          LAST_TOUCHSTART.id == LAST_TOUCHSTART.magnifiedId // tapping already selected arc
        ) {
          unfocusArcs();
        }
      })
      .on("click", function() {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();
      });

    // Create total text
    G_CHART_AREA.append("text")
      .classed("total-text", true)
      .text("TOTAL")
      .attr("transform", "translate(0, -40)");

    // Create total sum text
    G_CHART_AREA.append("text")
      .classed("total-sum-text", true)
      .text(
        DOLLAR_FORMAT(
          d3.sum(TOTALS, function(d) {
            return d.value;
          })
        )
      );

    // Append single text element representing all pending donations
    G_CHART_AREA.append("text")
      .classed("pending-donation-text", true)
      .text(
        "+" +
          100 *
            d3.sum(PENDING, function(d) {
              return d[3];
            }) +
          "\u00A2"
      )
      .attr(
        "transform",
        "translate(0, " +
          (-RADIUS - PENDING_TEXT_PADDING - PENDING_TEXT_HEIGHT) +
          ")"
      );
  }

  // Resize chart elements
  function resize() {
    // Interupt animation
    ANIMATING = false;
    SVG.selectAll("*").interrupt();

    // Hide tooltip
    TIP.hide();

    // Determine dimensions
    SVG_WIDTH = $(SVG_ID).width();
    SVG_HEIGHT = $(SVG_ID).height();
    RADIUS =
      Math.min(
        SVG_WIDTH - 2 * EDGE_PADDING,
        SVG_HEIGHT -
          2 * EDGE_PADDING -
          PENDING_TEXT_HEIGHT -
          PENDING_TEXT_PADDING
      ) / 2;

    // Update chart area group
    SVG.select(".g-chart-area").attr(
      "transform",
      "translate(" +
        SVG_WIDTH / 2 +
        ", " +
        (SVG_HEIGHT - EDGE_PADDING - RADIUS) +
        ")"
    );

    // Update arc generators
    ARC = d3
      .arc()
      .startAngle(function(d) {
        return d.startAngle;
      })
      .endAngle(function(d) {
        return d.endAngle;
      })
      .innerRadius(function(d) {
        return (
          INNER_RADIUS_RATIO * RADIUS - RADIUS_MAGNIFICATION_RATIO * RADIUS
        );
      })
      .outerRadius(function(d) {
        return RADIUS - RADIUS_MAGNIFICATION_RATIO * RADIUS;
      });

    MAGNIFIED_ARC = d3
      .arc()
      .startAngle(function(d) {
        return d.startAngle - ANGLE_MAGNIFICATION;
      })
      .endAngle(function(d) {
        return d.endAngle + ANGLE_MAGNIFICATION;
      })
      .innerRadius(function(d) {
        return (
          INNER_RADIUS_RATIO * RADIUS - 2 * RADIUS_MAGNIFICATION_RATIO * RADIUS
        );
      })
      .outerRadius(function(d) {
        return RADIUS;
      });

    // Move to updated data
    DATA = PIE(NEW_TOTALS);

    // Update data arcs
    G_ARCS.selectAll(".data-arc")
      .data(DATA, function(d) {
        return d.data.key;
      })
      .classed("focused", false)
      .attr("d", ARC)
      .style("opacity", 1);

    // Update total sum text
    G_CHART_AREA.select(".total-sum-text").text(
      DOLLAR_FORMAT(
        d3.sum(DATA, function(d) {
          return d.value;
        })
      )
    );

    // Remove pending donation text
    G_CHART_AREA.select(".pending-donation-text").remove();

    // Remove coins
    SVG.selectAll(".coin-image").remove();
  }

  // Drop "coins" from single text object into donut representing all pending donations
  function animate() {
    // Add pending donations to appropriate categories
    const updateTotals = [];
    let donationTotal = 0;
    let donation, entry;

    // Determine number of coins from total donation
    const numCoins = Math.floor(
      d3.sum(PENDING, function(d) {
        return d[3];
      }) * 100
    );

    // Piefy updated data
    DATA = PIE(NEW_TOTALS);

    // Append clip path
    SVG.append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr(
        "transform",
        "translate(0, " +
          (-RADIUS - PENDING_TEXT_PADDING - PENDING_TEXT_HEIGHT) +
          ")"
      )
      .attr(
        "transform",
        "translate(0, " +
          (SVG_HEIGHT -
            EDGE_PADDING -
            2 * RADIUS -
            PENDING_TEXT_PADDING -
            PENDING_TEXT_HEIGHT) +
          ")"
      )
      .attr("width", SVG_WIDTH)
      .attr("height", PENDING_TEXT_HEIGHT + PENDING_TEXT_PADDING + RADIUS);

    // Append coin images
    SVG.selectAll(".coin-image")
      .data(new Array(numCoins))
      .enter()
      .append("image")
      .classed("coin-image", true)
      .attr("xlink:href", "coin.PNG")
      .attr("width", 40)
      .attr("height", 40)
      .attr("x", function() {
        return SVG_WIDTH / 2 - 60 + Math.random() * 80;
      })
      .attr(
        "y",
        SVG_HEIGHT -
          EDGE_PADDING -
          2 * RADIUS -
          PENDING_TEXT_PADDING -
          PENDING_TEXT_HEIGHT -
          40
      );

    // Magnify relevant arcs
    G_ARCS.selectAll(".data-arc")
      .filter(function(d) {
        return PENDING.find(function(element) {
          return element[1] == d.data.key;
        });
      })
      .moveToFront()
      .transition()
      .duration(FOCUS_TRANS_TIME)
      .attr("d", MAGNIFIED_ARC);

    // Update donation text
    G_CHART_AREA.select(".pending-donation-text")
      .transition()
      .delay(FOCUS_TRANS_TIME + DELAY_TIME)
      .duration(DROP_IN_TRANS_TIME)
      .tween("text", function() {
        const that = d3.select(this);
        const oldCostNum = that.text().slice(1, -1);
        const newCostNum = 0;
        const i = d3.interpolateNumber(oldCostNum, newCostNum);
        return function(t) {
          that.text("+" + parseInt(i(t)) + "\u00A2");
        };
      })
      .style("opacity", 0);

    // Drop in coin images
    SVG.selectAll(".coin-image")
      .transition()
      .delay(function(d, i) {
        return (
          FOCUS_TRANS_TIME +
          DELAY_TIME +
          (i / numCoins) * (DROP_IN_TRANS_TIME / 2)
        );
      })
      .duration(DROP_IN_TRANS_TIME / 2)
      .attr("y", SVG_HEIGHT - RADIUS)
      .style("opacity", 0)
      .remove();

    // Update arcs
    G_ARCS.selectAll(".data-arc")
      .data(DATA, function(d) {
        return d.data.key;
      })
      .transition()
      .delay(FOCUS_TRANS_TIME + DELAY_TIME)
      .duration(DROP_IN_TRANS_TIME)
      .attrTween("d", function(d) {
        const orig = this;
        if (
          PENDING.find(function(element) {
            return element[1] == d.data.key;
          })
        ) {
          return arcTween(
            d,
            MAGNIFIED_ARC,
            orig.startAngle,
            d.startAngle,
            orig.endAngle,
            d.endAngle
          );
        } else {
          return arcTween(
            d,
            ARC,
            orig.startAngle,
            d.startAngle,
            orig.endAngle,
            d.endAngle
          );
        }
      });

    // Update total sum text
    G_CHART_AREA.select(".total-sum-text")
      .transition()
      .delay(FOCUS_TRANS_TIME + DELAY_TIME)
      .duration(DROP_IN_TRANS_TIME)
      .tween("text", function() {
        const that = d3.select(this);
        const oldCostNum = that.text().substring(1);
        const newCostNum = d3.sum(NEW_TOTALS, function(d) {
          return d.value;
        });
        const i = d3.interpolateNumber(oldCostNum, newCostNum);
        return function(t) {
          that.text(d3.format("$.2f")(i(t)));
        };
      });

    // Remove magnification from relevant arc
    G_ARCS.selectAll(".data-arc")
      .transition()
      .delay(FOCUS_TRANS_TIME + DELAY_TIME + DROP_IN_TRANS_TIME + DELAY_TIME)
      .duration(FOCUS_TRANS_TIME)
      .attr("d", ARC)
      .on("end", function() {
        ANIMATING = false;
      });
  }

  // Tween function to create interpolators for arc segments
  function arcTween(d, arc, origStart, finalStart, origEnd, finalEnd) {
    const interpolateStart = d3.interpolate(origStart, finalStart);
    const interpolateEnd = d3.interpolate(origEnd, finalEnd);
    return function(t) {
      return arc({
        startAngle: interpolateStart(t),
        endAngle: interpolateEnd(t),
        innerRadius: d.innerRadius,
        outerRadius: d.outerRadius
      });
    };
  }

  // Initialize tooltips
  function initializeTips() {
    TIP = d3
      .tip()
      .attr("class", "d3-tip")
      .offset([-120, 0])
      .html(function(d) {
        return (
          "<table> <tr> <td class='d3-tip-header'> " +
          d.data.index +
          " - " +
          d.data.key +
          "</td> </tr> <tr> <td> <span class='d3-tip-money'> " +
          DOLLAR_FORMAT(d.value) +
          "</span> <span class='d3-tip-text'> has been earned towards this SDG over " +
          d.data.num_donations +
          " donations. </span> </td> </tr> </table>"
        );
      });

    d3.select(this).call(TIP);
  }

  // Determine if touch event interesects arc
  function getTouchedArc(touch) {
    const svgOffset = $(SVG_ID).offset();
    const touchX = touch.pageX - svgOffset.left; // x location of touch relative to svg
    const touchY = touch.pageY - svgOffset.top; // y location of touch relative to svg
    const centerX = SVG_WIDTH / 2; // x location of donut center
    const centerY = SVG_HEIGHT - EDGE_PADDING - RADIUS; // y location of donut center
    const distX = touchX - centerX; // x distance between touch and donut center
    const distY = touchY - centerY; // y distance between touch and donut center
    const r = Math.hypot(distX, distY); // radius from touch to donut center

    if (
      r > RADIUS - RADIUS_MAGNIFICATION_RATIO * RADIUS ||
      r < INNER_RADIUS_RATIO * RADIUS - RADIUS_MAGNIFICATION_RATIO * RADIUS
    ) {
      return null;
    } else {
      let angle = Math.atan2(-distX, distY) + Math.PI;

      for (let i = 0; i < DATA.length; i++) {
        if (angle > DATA[i].startAngle && angle < DATA[i].endAngle) {
          return DATA[i];
        }
      }
    }
  }

  // Return all arcs to a neutral focus (not magnified, opacity of 1) and hide tooltip
  function unfocusArcs() {
    // Hide tooltip
    TIP.hide();

    // Bring opacity of non magnified arcs back to 1
    G_ARCS.selectAll(".data-arc")
      .classed("focused", false)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .style("opacity", 1)
      .attr("d", ARC);
  }

  // Focus arc with given id and unfocus all others
  function focusArc(d) {
    // Magnify touched arc and bring opacity to 1
    G_ARCS.select("#" + d.data.id)
      .classed("focused", true)
      .moveToFront()
      .transition()
      .duration(HOVER_TRANS_TIME)
      .attr("d", MAGNIFIED_ARC)
      .style("opacity", 1);

    // Unmagnify other arcs and drop opacity
    G_ARCS.selectAll(".data-arc:not(#" + d.data.id + ")")
      .classed("focused", false)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .attr("d", ARC)
      .style("opacity", NON_HOVER_OPACITY);
  }

  // Move tooltip to location based on touch location
  function moveTooltip(d) {
    const tooltipTracker = d3.select("#tooltip-tracker");
    const touch = d3.event.touches ? d3.event.touches[0] : d3.event;
    const svgOffset = $(SVG_ID).offset();

    tooltipTracker
      .attr("cx", touch.pageX - svgOffset.left)
      .attr("cy", touch.pageY - svgOffset.top);

    // Show tooltip
    TIP.offset([-120, 0]) // use default offset
      .show(d, tooltipTracker.node()) // show with default offset
      .offset(getOffset()) // adjust offset based on position with default offset
      .show(d, tooltipTracker.node()); // show with adjust offset
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

  animate();
});
