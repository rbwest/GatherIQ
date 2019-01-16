"use strict";

$(document).ready(function() {
  /******************************************************* Declare variables *******************************************************/

  // Data variables
  const SVG_ID = "#sdg-donut"; // ID of SVG element
  const DATA_MESSAGE = {
    Totals: [
      {
        Index: 1,
        Num_Donations: 1,
        Category: "No Poverty",
        Amount: 0.05
      },
      {
        Index: 2,
        Num_Donations: 3,
        Category: "Zero Hunger",
        Amount: 0.15
      },
      {
        Index: 3,
        Num_Donations: 1,
        Category: "Good Heatlh and Well-Being",
        Amount: 0.05
      },
      {
        Index: 4,
        Num_Donations: 1,
        Category: "Quality Education",
        Amount: 0.05
      },
      {
        Index: 5,
        Num_Donations: 2,
        Category: "Gender Equality",
        Amount: 0.1
      },
      {
        Index: 6,
        Num_Donations: 1,
        Category: "Clean Water and Sanitation",
        Amount: 0.05
      },
      {
        Index: 7,
        Num_Donations: 5,
        Category: "Affordable and Clean Energy",
        Amount: 0.25
      },
      {
        Index: 8,
        Num_Donations: 0,
        Category: "Decent Work and Economic Growth",
        Amount: 0
      },
      {
        Index: 9,
        Num_Donations: 5,
        Num_Donations: 1,
        Category: "Industry, Innovation, and Infrastructure",
        Amount: 0.25
      },
      {
        Index: 10,
        Num_Donations: 3,
        Category: "Reduced Inequalities",
        Amount: 0.15
      },
      {
        Index: 11,
        Num_Donations: 3,
        Category: "Sustainable Cities and Communities",
        Amount: 0.15
      },
      {
        Index: 12,
        Num_Donations: 1,
        Category: "Responsible Consumption and Production",
        Amount: 0.05
      },
      {
        Index: 13,
        Num_Donations: 2,
        Category: "Climate Action",
        Amount: 0.1
      },
      {
        Index: 14,
        Num_Donations: 1,
        Category: "Life Below Water",
        Amount: 0.05
      },
      {
        Index: 15,
        Num_Donations: 2,
        Category: "Life On Land",
        Amount: 0.1
      },
      {
        Index: 16,
        Num_Donations: 4,
        Category: "Peace and Justice Strong Institutions",
        Amount: 0.2
      },
      {
        Index: 17,
        Num_Donations: 1,
        Category: "Partnerships for the Goals",
        Amount: 0.05
      }
    ],
    Pending_Donations: [
      { Category: "Decent Work and Economic Growth", Amount: 0.25 },
      { Category: "Zero Hunger", Amount: 0.1 },
      { Category: "Good Heatlh and Well-Being", Amount: 0.3 },
      { Category: "Life Below Water", Amount: 0.05 }
    ]
  }; // Data message totals prior to last view, and donations since last view
  const FILL = {
    "No Poverty": "#e5243b",
    "Zero Hunger": "#dda63a",
    "Good Heatlh and Well-Being": "#4c9f38",
    "Quality Education": "#c5192d",
    "Gender Equality": "#ff3a21",
    "Clean Water and Sanitation": "#26bde2",
    "Affordable and Clean Energy": "#fcc30b",
    "Decent Work and Economic Growth": "#a21942",
    "Industry, Innovation, and Infrastructure": "#fd6925",
    "Reduced Inequalities": "#dd1367",
    "Sustainable Cities and Communities": "#fd9d24",
    "Responsible Consumption and Production": "#bf8b2e",
    "Climate Action": "#3f7e44",
    "Life Below Water": "#0a97d9",
    "Life On Land": "#56c02b",
    "Peace and Justice Strong Institutions": "#00689d",
    "Partnerships for the Goals": "#19486a"
  }; // Fill colors keyed to categories

  // Static dimension variables
  const SVG_WIDTH = $(SVG_ID).width(); //
  const SVG_HEIGHT = $(SVG_ID).height(); //
  const HOVER_TRANS_TIME = 250; //
  const EDGE_PADDING = 5; // Padding around exterior of chart
  const DATA_MESSAGE_TEXT_OFFSET = 30; //

  // Dynamic dimension variables
  let RADIUS; // Radius of pie/donut
  let FOCUS_TRANS_TIME = 1000; // Duration of arc becoming focused
  let DELAY_TIME = 100; // Delay between transition steps
  let DROP_IN_TRANS_TIME = 2500; // Duration of donation being dropped in

  // Selection and d3 variables
  d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
      this.parentNode.appendChild(this);
    });
  }; // Bring element to front of SVG (from https://github.com/wbkd/d3-extended)
  const DOLLAR_FORMAT = d3.format("$.2f"); //
  let SVG; // SVG selection
  let TIP; // Tooltip generator
  let G_CHART_AREA; // Chart area group selection
  let G_ARCS; // Path group selection
  let ARC; // Arc generator to create arc paths from arc data
  let MAGNIFIED_ARC; // Arc generator to create magnified arc path
  let PIE; // Pie data generator
  let DATA; // Piefied data
  let ANIMATING = true; // Boolean to prevent tooltips during animation

  /******************************************************* Render functions *******************************************************/

  // Draw donut
  function draw() {
    // Select svg
    SVG = d3
      .select(SVG_ID)
      .each(initializeTips)
      .on("touchstart", function() {
        // Hide tooltip
        TIP.hide();

        // Unmagnify arc
        G_ARCS.select(".magnified-arc")
          .classed("magnified-arc", false)
          .transition()
          .duration(HOVER_TRANS_TIME)
          .attr("d", ARC);
      });

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

    // Determine dimensions
    RADIUS = (Math.min(SVG_WIDTH / 2, SVG_HEIGHT / 2) - EDGE_PADDING) / 1.03;

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

    // Create arc generator
    ARC = d3
      .arc()
      .innerRadius(0.7 * RADIUS)
      .outerRadius(RADIUS)
      .startAngle(function(d) {
        return d.startAngle;
      })
      .endAngle(function(d) {
        return d.endAngle;
      });
    // .startAngle(function(d) {
    //   return (d.endAngle - d.startAngle < .01) ? d.startAngle : d.startAngle + .02;
    // })
    // .endAngle(function(d) {
    //   return (d.endAngle - d.startAngle < .01) ? d.endAngle : d.endAngle - .02;
    // });

    // Append circle to bind tooltip to
    SVG.selectAll("#tooltip-tracker")
      .data([DATA])
      .enter()
      .append("circle")
      .attr("id", "tooltip-tracker")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1)
      .style("opacity", 0);

    // Create magnified arc generator
    MAGNIFIED_ARC = d3
      .arc()
      .innerRadius(0.67 * RADIUS)
      .outerRadius(1.03 * RADIUS)
      .startAngle(function(d) {
        return d.startAngle - 0.1;
      })
      .endAngle(function(d) {
        return d.endAngle + 0.1;
      });

    // Create background circle
    // G_CHART_AREA.append("path")
    //   .classed("background-circle", true)
    //   .attr("d", function() {
    //     return d3
    //       .arc()
    //       .innerRadius(0)
    //       .outerRadius(0.9 * RADIUS)
    //       .startAngle(0)
    //       .endAngle(2 * Math.PI)();
    //   })
    //   .attr("fill", "white");

    // Create pie data generator
    PIE = d3
      .pie()
      .sort(null)
      .value(function(d) {
        return d.Amount;
      });

    // Add small value to each amount in totals to prevent path transition issues for 0 values, and add id
    for (let i = 0; i < DATA_MESSAGE.Totals.length; i++) {
      DATA_MESSAGE.Totals[i].Amount += 0.000001;
      DATA_MESSAGE.Totals[i].ID = DATA_MESSAGE.Totals[i].Category.replace(
        / /g,
        "_"
      ).replace(/,/g, "");
    }

    // Piefy data
    DATA = PIE(DATA_MESSAGE.Totals);

    // Create data arcs group
    G_ARCS = G_CHART_AREA.append("g").classed("g-arcs", true);

    // Create data arcs
    G_ARCS.selectAll(".data-arc")
      .data(DATA, function(d) {
        return d.data.ID;
      })
      .enter()
      .append("path")
      .attr("id", function(d) {
        return d.data.ID;
      })
      .classed("data-arc", true)
      .attr("d", ARC)
      .attr("fill", function(d) {
        return FILL[d.data.Category];
      })
      .on("touchstart", function(d, i) {
        // Prevent tooltips during animation
        if (ANIMATING) {
          return;
        }

        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Select magnified arc
        const magnifiedArc = d3.select(".magnified-arc");
        const magnifiedArcData = magnifiedArc.empty()
          ? null
          : magnifiedArc.datum().data;

        // Unmagnify currently magnified arc
        magnifiedArc
          .classed("magnified-arc", false)
          .transition()
          .duration(HOVER_TRANS_TIME)
          .attr("d", ARC);

        // If tapping already selected arc, hide tooltip
        if (magnifiedArcData && d.data.ID == magnifiedArcData.ID) {
          // Hide tooltip
          TIP.hide();
        }
        // Otherwise, update tooltip, magnify new arc, move tooltip location, and show tooltip
        else {
          // Update tooltip content
          TIP.html(function() {
            return (
              "<div class='d3-tip-number' style='background-color: " +
              FILL[d.data.Category] +
              "; border-color: " +
              FILL[d.data.Category] +
              ";'>" +
              d.data.Index +
              "</div><div class='d3-tip-title'>" +
              d.data.Category +
              "</div><div class='d3-tip-text'>" +
              DOLLAR_FORMAT(d.data.Amount) +
              " earned over " +
              d.data.Num_Donations +
              " donations.</div>"
            );
          }).style("border-color", FILL[d.data.Category]);

          // console.log("magnify");
          // console.log(this);
          // d3.select(this)
          //   .moveToFront()
          //   .classed("magnified-arc", true)
          //   .transition()
          //   .duration(1000)
          //   .attr("fill", "black")
          //   .attr("d", MAGNIFIED_ARC);

          // Magnify arc
          d3.select(this)
            .classed("magnified-arc", true)
            .moveToFront()
            .transition()
            .duration(HOVER_TRANS_TIME)
            .attr("d", MAGNIFIED_ARC);

          // Move tooltip tracker to touch location
          const tooltipTracker = d3.select("#tooltip-tracker");
          const touch = d3.event.touches[0];
          const svgOffset = $(SVG_ID).offset();

          tooltipTracker
            .attr("cx", touch.pageX - svgOffset.left)
            .attr("cy", touch.pageY - svgOffset.top);

          // Show tooltip
          TIP.show(d, tooltipTracker.node());
        }
      })
      .on("touchmove", function(d, i) {
        // Prevent tooltips during animation
        if (ANIMATING) {
          return;
        }

        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        // Get currently hovered arc from touch
        const touch = d3.event.touches[0];
        const hoveredArcData = getTouchedArc(touch);

        // If hovering on an arc, move tooltip tracker and show
        if (hoveredArcData) {
          // Move tooltip tracker to touch location
          const tooltipTracker = d3.select("#tooltip-tracker");
          const svgOffset = $(SVG_ID).offset();

          tooltipTracker
            .attr("cx", touch.pageX - svgOffset.left)
            .attr("cy", touch.pageY - svgOffset.top);

          // Get currently magnified arc
          const magnifiedArc = d3.select(".magnified-arc");
          const magnifiedArcData = magnifiedArc.empty()
            ? null
            : magnifiedArc.datum().data;

          // If no tooltip shown (just touched off) or moving to new tooltip, update tip content, unmagnify previous arc, and magnify new arc
          if (!magnifiedArcData || hoveredArcData.ID != magnifiedArcData.ID) {
            // Update tooltip content
            TIP.html(function() {
              return (
                "<div class='d3-tip-number' style='background-color: " +
                FILL[hoveredArcData.Category] +
                "; border-color: " +
                FILL[hoveredArcData.Category] +
                ";'>" +
                hoveredArcData.Index +
                "</div><div class='d3-tip-title'>" +
                hoveredArcData.Category +
                "</div><div class='d3-tip-text'>" +
                DOLLAR_FORMAT(hoveredArcData.Amount) +
                " earned over " +
                hoveredArcData.Num_Donations +
                " donations.</div>"
              );
            }).style("border-color", FILL[hoveredArcData.Category]);

            // Unmagnify currently magnified arc
            magnifiedArc
              .classed("magnified-arc", false)
              .transition()
              .duration(HOVER_TRANS_TIME)
              .attr("d", ARC);

            // Magnify arc
            d3.select("#" + hoveredArcData.ID)
              .classed("magnified-arc", true)
              .moveToFront()
              .transition()
              .duration(HOVER_TRANS_TIME)
              .attr("d", MAGNIFIED_ARC);
          }

          // Show tooltip
          TIP.show(d, d3.select("#tooltip-tracker").node());
        }
      });

    // Create total text
    G_CHART_AREA.append("text")
      .classed("total-text", true)
      .text("Total")
      .attr("transform", "translate(0, -40)");

    // Create total sum text
    G_CHART_AREA.append("text")
      .classed("total-sum-text", true)
      .text(
        DOLLAR_FORMAT(
          d3.sum(DATA_MESSAGE.Totals, function(d) {
            return d.Amount;
          })
        )
      );

    // Append single text element representing all pending donations
    G_CHART_AREA.append("text")
      .classed("pending-donation-text", true)
      .text(
        "+" +
          100 *
            d3.sum(DATA_MESSAGE.Pending_Donations, function(d) {
              return d.Amount;
            }) +
          "\u00A2"
      )
      .attr(
        "transform",
        "translate(0, " + (-RADIUS - DATA_MESSAGE_TEXT_OFFSET) + ")"
      );
  }

  // Drop "coins" from single text object into donut representing all pending donations
  function animate() {
    // Add pending donations to appropriate categories
    const updateTotals = [];
    let donationTotal = 0;
    let donation, entry;
    for (let i = 0; i < DATA_MESSAGE.Totals.length; i++) {
      entry = DATA_MESSAGE.Totals[i];

      for (let j = 0; j < DATA_MESSAGE.Pending_Donations.length; j++) {
        donation = DATA_MESSAGE.Pending_Donations[j];

        if (entry.Category == donation.Category) {
          entry.Num_Donations += 1;
          entry.Amount += donation.Amount;
          donationTotal += donation.Amount;
        }
      }

      updateTotals.push(entry);
    }

    // Determine number of coins from total donation
    const numCoins = Math.floor(donationTotal * 100);

    // Piefy updated data
    const updateData = PIE(updateTotals);

    // Append clip path
    SVG.append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr(
        "transform",
        "translate(0, " +
          (SVG_HEIGHT - 2 * RADIUS - DATA_MESSAGE_TEXT_OFFSET) +
          ")"
      )
      .attr("width", SVG_WIDTH)
      .attr("height", DATA_MESSAGE_TEXT_OFFSET + RADIUS);

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
      .attr("y", 0);

    // Magnify relevant arcs
    G_ARCS.selectAll(".data-arc")
      .filter(function(d) {
        return DATA_MESSAGE.Pending_Donations.find(function(element) {
          return element.Category == d.data.Category;
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
      .data(updateData, function(d) {
        return d.data.Category;
      })
      .transition()
      .delay(FOCUS_TRANS_TIME + DELAY_TIME)
      .duration(DROP_IN_TRANS_TIME)
      .attrTween("d", function(d) {
        const orig = DATA.find(function(element) {
          return element.data.Category == d.data.Category;
        });
        if (
          DATA_MESSAGE.Pending_Donations.find(function(element) {
            return element.Category == d.data.Category;
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
        const newCostNum = d3.sum(updateTotals, function(d) {
          return d.Amount;
        });
        const i = d3.interpolateNumber(oldCostNum, newCostNum);
        return function(t) {
          that.text(d3.format("$.2f")(i(t)));
        };
      });

    // Remove magnification from relevant arc
    G_ARCS.selectAll(".data-arc")
      .filter(function(d) {
        return DATA_MESSAGE.Pending_Donations.find(function(element) {
          return element.Category == d.data.Category;
        });
      })
      .transition()
      .delay(FOCUS_TRANS_TIME + DELAY_TIME + DROP_IN_TRANS_TIME + DELAY_TIME)
      .duration(FOCUS_TRANS_TIME)
      .attr("d", ARC)
      .on("end", function() {
        DATA = updateData;
        ANIMATING = false;
      });
  }

  // Tween function to create interpolators for arc segments
  function arcTween(d, arc, origStart, finalStart, origEnd, finalEnd) {
    const interpolateStart = d3.interpolate(origStart, finalStart);
    const interpolateEnd = d3.interpolate(origEnd, finalEnd);
    return function(t) {
      d.startAngle = interpolateStart(t);
      d.endAngle = interpolateEnd(t);
      return arc(d);
    };
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
    const r = Math.hypot(distX, distY); // radius from touch to donut center

    if (r < 0.5 * RADIUS || r > RADIUS) {
      return null;
    } else {
      let angle = Math.atan2(-distX, distY) + Math.PI;

      for (let i = 0; i < DATA.length; i++) {
        if (angle > DATA[i].startAngle && angle < DATA[i].endAngle) {
          return DATA[i].data;
        }
      }
    }
  }

  draw();

  setTimeout(1000, animate());
});
