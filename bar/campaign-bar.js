"use strict";

$(document).ready(function() {
  /******************************************************* Declare variables *******************************************************/

  // Data variables
  const SVG_ID = "#campaign-bar"; // ID of SVG element
  const DATA_MESSAGE = {
    Campaign_Current_Totals: [
      {
        Category: "Get Healthy with Nike",
        Num_Donations: 5,
        Total: 0.25,
        Color: "#e95814"
      },
      {
        Category: "End Hunger with Coca-Cola",
        Num_Donations: 2,
        Total: 0.1,
        Color: "#ed1c16"
      },
      {
        Category: "Fight Gender Inequality with Google",
        Num_Donations: 3,
        Total: 0.15,
        Color: "#4285f4"
      },
      {
        Category: "Promote Clean Energy with Amazon",
        Num_Donations: 4,
        Total: 0.2,
        Color: "#ff9900"
      },
      {
        Category: "Build Sustainable Cities with Airbnb",
        Num_Donations: 6,
        Total: 0.3,
        Color: "#fd5c63"
      }
    ]
  }; // Data message

  // Static dimension variables
  const SVG_WIDTH = $(SVG_ID).width(); //
  const SVG_HEIGHT = $(SVG_ID).height(); //
  const HOVER_TRANS_TIME = 100; //
  const EDGE_PADDING = 5; // Padding around exterior of chart

  // Dynamic dimension variables
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

  /******************************************************* Render functions *******************************************************/

  // Draw bars
  function draw() {
    // Select svg
    SVG = d3
      .select(SVG_ID)
      .each(initializeTips)
      .on("touchstart", function() {
        // Hide tooltip
        TIP.hide();
      });

    // Determine dimensions
    CHART_WIDTH = SVG_WIDTH * 0.7;
    CHART_HEIGHT = SVG_HEIGHT * 0.9;

    // Initialize scales
    X_SCALE = d3
      .scaleBand()
      .rangeRound([0, CHART_WIDTH])
      .padding(0.1)
      .domain(
        DATA_MESSAGE.Campaign_Current_Totals.map(function(d) {
          return d.Category;
        })
      );

    Y_SCALE = d3
      .scaleLinear()
      .rangeRound([CHART_HEIGHT, 0])
      .domain([
        0,
        d3.max(DATA_MESSAGE.Campaign_Current_Totals, function(d) {
          return d.Total;
        })
      ]);

    // Append chart area group
    G_CHART_AREA = SVG.append("g")
      .classed("g-chart-area", true)
      .attr(
        "transform",
        "translate(" +
          (SVG_WIDTH - CHART_WIDTH) / 2 +
          ", " +
          (SVG_HEIGHT - EDGE_PADDING - CHART_HEIGHT) +
          ")"
      );

    // Add small value to each amount in totals to prevent path transition issues for 0 values, and add id
    for (let i = 0; i < DATA_MESSAGE.Campaign_Current_Totals.length; i++) {
      DATA_MESSAGE.Campaign_Current_Totals[i].Total += 0.000001;
      DATA_MESSAGE.Campaign_Current_Totals[
        i
      ].ID = DATA_MESSAGE.Campaign_Current_Totals[i].Category.replace(
        / /g,
        "_"
      ).replace(/,/g, "");
    }

    // Create data bars group
    G_BARS = G_CHART_AREA.append("g")
      .classed("g-bars", true)
      .attr("filter", "url(#campaign-shadow)");

    // Create data arcs
    G_BARS.selectAll(".data-bar")
      .data(DATA_MESSAGE.Campaign_Current_Totals, function(d) {
        return d.ID;
      })
      .enter()
      .append("rect")
      .attr("id", function(d) {
        return d.ID;
      })
      .classed("data-bar", true)
      .attr("x", function(d) {
        return X_SCALE(d.Category);
      })
      .attr("y", function(d) {
        return Y_SCALE(d.Total);
      })
      .attr("width", function() {
        return X_SCALE.bandwidth();
      })
      .attr("height", function(d) {
        return CHART_HEIGHT - Y_SCALE(d.Total);
      })
      .attr("fill", function(d) {
        return d.Color;
      })
      .on("touchstart", function(d, i) {
        // Prevent event from falling through to underlying elements or causing scroll
        d3.event.stopPropagation();
        d3.event.preventDefault();

        //
        TIP.style("border-color", d.Color).show(d, this);
      });
  }

  // Initialize tooltips
  function initializeTips() {
    TIP = d3
      .tip()
      .attr("class", "d3-tip")
      .offset([-10, 0])
      .html(function(d) {
        return (
          "<div class='d3-tip-title'>" +
          d.Category +
          "</div><div class='d3-tip-text'>" +
          DOLLAR_FORMAT(d.Total) +
          " earned over " +
          d.Num_Donations +
          " donations.</div>"
        );
      });

    d3.select(this).call(TIP);
  }

  draw();
});
