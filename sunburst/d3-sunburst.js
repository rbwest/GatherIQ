"use strict";

$(document).ready(function() {
  /******************************************************* Declare variables *******************************************************/

  // Data variables
  const SVG_ID = "#d3-sunburst"; // ID of SVG element
  const DATA_MESSAGE = [
    [2198, "No Poverty", "Commission to End Poverty"],
    [1987, "Reduced Inequalities", "The LGBQT Alliance for Social Justice"],
    [1827, "Zero Hunger", "Feed the World. Org"],
    [1726, "Zero Hunger", "Commission to End Poverty"],
    [2003, "Good Health and Well-Being", "A Healthier World"],
    [1890, "Quality Education", "All Achieve Together"],
    [267, "Quality Education", "Less Testing, More Talking"],
    [2817, "Gender Equality", "The LGBQT Alliance for Social Justice"],
    [11123, "Clean Water and Sanitation", "Safe Sanitation for All"],
    [1203, "Affordable and Clean Energy", "Cleaner, Better, for the Future"],
    [1928, "Affordable and Clean Energy", "Shine Bright For Solar"],
    [1729, "Zero Hunger", "Healthy Tomorrows.Org"]
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
  const SVG_WIDTH = $(SVG_ID).width(); //
  const SVG_HEIGHT = $(SVG_ID).height(); //
  const HOVER_TRANS_TIME = 250; //
  const EDGE_PADDING = 5; // Padding around exterior of chart
  const NON_HOVER_OPACITY = 0.3;

  // Dynamic dimension variables
  let RADIUS; // Radius of pie/donut
  let TOTAL_SUM_HEIGHT; // Height of total sum text
  let LABEL_HEIGHT; // Height of label texts
  let SDG_LABEL_WIDTH; // Width of sdg label text
  let RECIPIENT_LABEL_WIDTH; // Width of recipient label text
  let MAX_LABEL_WIDTH; // Longer of two label widths

  // Selection and d3 variables
  d3.color.prototype.isDark = function() {
    const luma = 0.2126 * this.r + 0.7152 * this.g + 0.0722 * this.b;
    return luma < DARK_THRESHOLD;
  };
  d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
      this.parentNode.appendChild(this);
    });
  }; // Bring element to front of SVG (from https://github.com/wbkd/d3-extended)
  const DOLLAR_FORMAT = d3.format("$,.2f"); //
  const COLOR_SCALE = d3.scaleOrdinal(d3.schemeDark2); // Ordinal color scale as backup
  let SVG; // SVG selection
  let TIP; // Tooltip generator
  let G_CHART_AREA; // Chart area group selection
  let G_ARCS; // Path group selection
  let ARC; // Arc generator to create arc paths from arc data
  let MAGNIFIED_ARC; // Arc generator to create magnified arc path
  let PIE; // Pie data generator
  let NEST; // Nested data data
  let ROOT; // Root of data hierarchy
  let DESCENDANTS; // Descendants of data hierarchy in flat stucture
  let LABEL_LINES; // Array of points to create label lines
  let LAST_TOUCHSTART;

  /******************************************************* Render functions *******************************************************/

  // Draw donut
  function draw() {
    // Select svg
    SVG = d3
      .select(SVG_ID)
      .each(initializeTips)
      .on("touchstart", unfocusArcs);

    // Hide tooltip and unfocus arc on prev/next clicked
    d3.selectAll(".prev-arrow, .next-arrow").on("click", function() {
      // Hide tooltip
      d3.selectAll(".d3-tip").style("opacity", 0);

      // Unmagnify arc
      G_ARCS.select(".magnified-arc")
        .classed("magnified-arc", false)
        .transition()
        .duration(HOVER_TRANS_TIME)
        .attr("d", ARC);
    });

    // Get height of ring labels
    SVG.append("text")
      .classed("label-text", true)
      .text("TEXT")
      .each(function() {
        LABEL_HEIGHT = this.getBBox().height;
        this.remove();
      });

    // Determine dimensions
    RADIUS =
      (Math.min(SVG_WIDTH / 2, SVG_HEIGHT / 2 - 2 * LABEL_HEIGHT) -
        EDGE_PADDING) /
      1.03;

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

    // Append circle to bind tooltip to
    SVG.selectAll("#tooltip-tracker")
      .data([DATA_MESSAGE])
      .enter()
      .append("circle")
      .attr("id", "tooltip-tracker")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1)
      .style("opacity", 0);

    // Create data arcs group
    G_ARCS = G_CHART_AREA.append("g").classed("g-arcs", true);

    // Convert flat data into nested structure
    NEST = d3
      .nest()
      .key(function(d) {
        return d[1];
      })
      .key(function(d) {
        return d[2];
      })
      .rollup(function(d) {
        return d3.sum(d, function(d) {
          return d[0];
        });
      })
      .entries(DATA_MESSAGE);

    // Get root of hierarchy created from nest
    ROOT = d3
      .hierarchy({ values: NEST }, function(d) {
        return d.values;
      })
      .sum(function(d) {
        return d.value;
      });

    // Partition hierarchy
    d3.partition().size([2 * Math.PI, RADIUS * RADIUS])(ROOT);

    // Get hierarchy descendants in flat data structure
    DESCENDANTS = ROOT.descendants();

    // Add ids, colors, and tooltip to descendants to simplify event listeners
    for (
      let d = DESCENDANTS[0], i = 0;
      i <= DESCENDANTS.length;
      d = DESCENDANTS[i++]
    ) {
      if (d.depth) {
        d.data.id = "arc" + i;
        switch (d.depth) {
          case 1:
            d.data.color = GOALS[d.data.key].color;
            d.data.tooltip =
              "<table> <tr> <td class='d3-tip-header'> " +
              GOALS[d.data.key].index +
              " - " +
              d.data.key +
              "</td> </tr> <tr> <td> <span class='d3-tip-money'> " +
              DOLLAR_FORMAT(d.value) +
              "</span> <span class='d3-tip-text'> has been earned towards this SDG. </span> </td> </tr> </table>";
            break;
          case 2:
            d.data.color = d3
              .color(GOALS[d.parent.data.key].color)
              .brighter(0.5)
              .toString();
            d.data.tooltip =
              "<table> <tr> <td class='d3-tip-header'> " +
              d.data.key +
              "</td> </tr> <tr> <td> <span class='d3-tip-money'> " +
              DOLLAR_FORMAT(d.value) +
              "</span> <span class='d3-tip-text'> has been donated to this recipient. </span> </td> </tr> </table>";
            break;
        }
      }
    }

    // Create arc generators
    ARC = d3
      .arc()
      .startAngle(function(d) {
        return d.x0;
      })
      .endAngle(function(d) {
        return d.x1;
      })
      .padAngle(function(d) {
        return Math.min((d.x1 - d.x0) / 2, 0.005);
      })
      .padRadius(RADIUS / 2)
      .innerRadius(function(d) {
        return Math.sqrt(d.y0);
      })
      .outerRadius(function(d) {
        return Math.sqrt(d.y1);
      });

    MAGNIFIED_ARC = d3
      .arc()
      .startAngle(function(d) {
        return d.x0 - 0.1;
      })
      .endAngle(function(d) {
        return d.x1 + 0.1;
      })
      // .padAngle(function(d) {
      //   return Math.min((d.x1 - d.x0) / 2, 0.005);
      // })
      // .padRadius(RADIUS / 2)
      .innerRadius(function(d) {
        return Math.sqrt(d.y0) - 0.03 * RADIUS;
      })
      .outerRadius(function(d) {
        return Math.sqrt(d.y1) + 0.03 * RADIUS;
      });

    // Create data arcs
    G_ARCS.selectAll(".data-arc")
      .data(
        ROOT.descendants().filter(function(d) {
          return d.depth;
        })
      )
      .enter()
      .append("path")
      .classed("data-arc", true)
      .attr("id", function(d) {
        return d.data.id;
      })
      .attr("fill", function(d) {
        return d.data.color;
      })
      .attr("d", ARC)
      .on("touchstart", function(d, i) {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Get currently magnified arc
        const magnifiedArc = d3.select(".magnified-arc");
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

        // Update tooltip content
        TIP.html(d.data.tooltip);

        // Move tooltip tracker to touch location
        moveTooltip(d);
      })
      .on("touchmove", function(d, i) {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Update last touchstart
        LAST_TOUCHSTART.moved = true;

        // Get currently hovered arc from touch
        const hoveredArcData = getTouchedArc(d3.event.touches[0]);

        // If hovering on an arc, move tooltip tracker and show
        if (hoveredArcData) {
          // Get currently magnified arc
          const magnifiedArc = d3.select(".magnified-arc");
          const magnifiedArcData = magnifiedArc.empty()
            ? null
            : magnifiedArc.datum();

          // If moving to new tooltip, update tip content and focus hovered arc
          if (hoveredArcData.data.id != magnifiedArcData.data.id) {
            // Update tooltip content
            TIP.html(hoveredArcData.data.tooltip);

            // Focus touched arc
            focusArc(hoveredArcData);
          }

          // Move tooltip tracker to touch location
          moveTooltip(d);
        }
      })
      .on("touchend", function() {
        if (
          !LAST_TOUCHSTART.moved && // tap without drag &&
          LAST_TOUCHSTART.id == LAST_TOUCHSTART.magnifiedId // tapping already selected arc
        ) {
          unfocusArcs();
        }
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
          d3.sum(
            ROOT.descendants().filter(function(d) {
              return d.depth == 1;
            }),
            function(d) {
              return d.value;
            }
          )
        )
      );

    // Append outer ring label (recipient)
    G_CHART_AREA.append("text")
      .classed("label-text", true)
      .text("Donation Recipient")
      .attr(
        "transform",
        "translate(" + -RADIUS + ", " + (-RADIUS - 2 * LABEL_HEIGHT) + ")"
      )
      .each(function() {
        RECIPIENT_LABEL_WIDTH = this.getComputedTextLength();
      });

    // Append inner ring label (sdg)
    G_CHART_AREA.append("text")
      .classed("label-text", true)
      .text("Sustainable Development Goal")
      .attr(
        "transform",
        "translate(" + -RADIUS + ", " + (-RADIUS - LABEL_HEIGHT) + ")"
      )
      .each(function() {
        SDG_LABEL_WIDTH = this.getComputedTextLength();
        MAX_LABEL_WIDTH = Math.max(RECIPIENT_LABEL_WIDTH, SDG_LABEL_WIDTH);
      });

    // Append label lines
    LABEL_LINES = [
      {
        x1: -RADIUS + RECIPIENT_LABEL_WIDTH + EDGE_PADDING,
        x2: 0,
        y1: -RADIUS - 1.7 * LABEL_HEIGHT,
        y2: -RADIUS - 1.7 * LABEL_HEIGHT
      }, // Top horizontal
      {
        x1: -RADIUS + SDG_LABEL_WIDTH + EDGE_PADDING,
        x2: -LABEL_HEIGHT,
        y1: -RADIUS - 0.7 * LABEL_HEIGHT,
        y2: -RADIUS - 0.7 * LABEL_HEIGHT
      }, // Bottom horizontal
      {
        x1: 0,
        x2: 0,
        y1: -RADIUS - 1.7 * LABEL_HEIGHT,
        y2: -RADIUS
      }, // Top vertical
      {
        x1: -LABEL_HEIGHT,
        x2: -LABEL_HEIGHT,
        y1: -RADIUS - 0.7 * LABEL_HEIGHT,
        y2: -0.82 * RADIUS
      } // Bottom vertical
    ];

    G_ARCS.selectAll(".label-line")
      .data(LABEL_LINES)
      .enter()
      .append("line")
      .classed("label-line", true)
      .attr("x1", function(d) {
        return d.x1;
      })
      .attr("x2", function(d) {
        return d.x2;
      })
      .attr("y1", function(d) {
        return d.y1;
      })
      .attr("y2", function(d) {
        return d.y2;
      });
  }

  // Initialize tooltips
  function initializeTips() {
    TIP = d3
      .tip()
      .attr("class", "d3-tip")
      .offset([-120, 0])
      .html("Place Holder");

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
    const r2 = Math.pow(distX, 2) + Math.pow(distY, 2); // radius squared from touch to donut center
    const angle = Math.atan2(-distX, distY) + Math.PI; // angle from donut center

    for (
      let d = DESCENDANTS[0], i = 0;
      i <= DESCENDANTS.length;
      d = DESCENDANTS[i++]
    ) {
      if (
        d.depth && // not root
        (angle > d.x0 && angle < d.x1) && // angle in range
        (r2 > d.y0 && r2 < d.y1) // radius in range
      ) {
        return d;
      }
    }
  }

  // Return all arcs to a neutral focus (not magnified, opacity of 1) and hide tooltip
  function unfocusArcs() {
    // Hide tooltip
    TIP.hide();

    // Bring opacity of non magnified arcs back to 1
    G_ARCS.selectAll(".data-arc")
      .classed("magnified-arc", false)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .style("opacity", 1)
      .attr("d", ARC);

    // Bring label lines to front
    G_ARCS.selectAll(".label-line").moveToFront();
  }

  // Focus arc with given id and unfocus all others
  function focusArc(d) {
    // Bring label lines to front
    G_ARCS.selectAll(".label-line").moveToFront();

    // Magnify touched arc and bring opacity to 1
    G_ARCS.select("#" + d.data.id)
      .classed("magnified-arc", true)
      .moveToFront()
      .transition()
      .duration(HOVER_TRANS_TIME)
      .attr("d", MAGNIFIED_ARC)
      .style("opacity", 1);

    // Unmagnify other arcs and drop opacity
    G_ARCS.selectAll(".data-arc:not(#" + d.data.id + ")")
      .classed("magnified-arc", false)
      .transition()
      .duration(HOVER_TRANS_TIME)
      .attr("d", ARC)
      .style("opacity", NON_HOVER_OPACITY);
  }

  // Move tooltip to location based on touch location
  function moveTooltip(d) {
    const tooltipTracker = d3.select("#tooltip-tracker");
    const touch = d3.event.touches[0];
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
});
