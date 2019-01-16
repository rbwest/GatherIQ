"use strict";

$(document).ready(function() {
  /******************************************************* Declare variables *******************************************************/

  // Data variables
  const SVG_ID = "#d3-area"; // ID of SVG element
  const DATA_MESSAGE = {
    Charities: [
      {
        Category: "The Climate Reality Project",
        Color: "#3f7e44",
        Totals: [
          {
            Date: "7/2018",
            Total: 0.1
          },
          {
            Date: "8/2018",
            Total: 0.15
          },
          {
            Date: "9/2018",
            Total: 0.15
          },
          {
            Date: "10/2018",
            Total: 0.3
          },
          {
            Date: "11/2018",
            Total: 0.35
          },
          {
            Date: "12/2018",
            Total: 0.4
          }
        ]
      },
      {
        Category: "American Civil Liberties Union Foundation",
        Color: "#dd1367",
        Totals: [
          {
            Date: "7/2018",
            Total: 0
          },
          {
            Date: "8/2018",
            Total: 0.4
          },
          {
            Date: "9/2018",
            Total: 0.45
          },
          {
            Date: "10/2018",
            Total: 0.5
          },
          {
            Date: "11/2018",
            Total: 0.55
          },
          {
            Date: "12/2018",
            Total: 0.55
          }
        ]
      },
      {
        Category: "Kahn Academy",
        Color: "#c5192d",
        Totals: [
          {
            Date: "7/2018",
            Total: 0.05
          },
          {
            Date: "8/2018",
            Total: 0.2
          },
          {
            Date: "9/2018",
            Total: 0.2
          },
          {
            Date: "10/2018",
            Total: 0.25
          },
          {
            Date: "11/2018",
            Total: 0.25
          },
          {
            Date: "12/2018",
            Total: 0.3
          }
        ]
      }
    ]
  }; // Data message
  let FLAT_DATA = [];

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
  const TIME_PARSE = d3.timeParse("%m/%Y");
  let SVG; // SVG selection
  let TIP; // Tooltip generator
  let DEFS;
  let CLIP_PATH;
  let X_SCALE; // Time scale for dates
  let Y_SCALE; // Linear scale for totals
  let G_CLIP;
  let G_CHART_AREA; // Chart area group selection
  let G_LINES; //
  let LINE;
  let ANIMATING = true; // Boolean to prevent tooltips during animation

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

    // Append defs
    DEFS = SVG.append("defs");

    // Append clipPath
    CLIP_PATH = DEFS.append("clipPath").attr("id", "d3-area-clip");

    // Append clip path rect
    CLIP_PATH.append("rect")
      .attr("x", (SVG_WIDTH - CHART_WIDTH) / 2 - EDGE_PADDING)
      .attr("y", SVG_HEIGHT - 2 * EDGE_PADDING - CHART_HEIGHT)
      .attr("width", 0)
      .attr("height", CHART_HEIGHT + 2 * EDGE_PADDING);

    // Flatten data to determine scales
    flatten();

    // Initialize scales
    X_SCALE = d3
      .scaleTime()
      .domain(
        d3.extent(FLAT_DATA, function(d) {
          return d.Date;
        })
      )
      .rangeRound([0, CHART_WIDTH]);

    Y_SCALE = d3
      .scaleLinear()
      .rangeRound([CHART_HEIGHT, 0])
      .domain([
        0,
        d3.max(FLAT_DATA, function(d) {
          return d.Total;
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
          (SVG_WIDTH - CHART_WIDTH) / 2 +
          ", " +
          (SVG_HEIGHT - EDGE_PADDING - CHART_HEIGHT) +
          ")"
      );

    // Create data lines group
    G_LINES = G_CHART_AREA.append("g").classed("g-lines", true);

    // Create line generator
    LINE = d3
      .line()
      .x(function(d) {
        return X_SCALE(d.Date);
      })
      .y(function(d) {
        return Y_SCALE(d.Total);
      });

    // Iterate over charities creating one line for each
    for (let i = 0; i < DATA_MESSAGE.Charities.length; i++) {
      let data = DATA_MESSAGE.Charities[i];

      G_LINES.append("path")
        .datum(data.Totals)
        .classed("data-line", true)
        .attr("stroke", data.Color)
        .attr("d", LINE);
    }
  }

  // Animate lines being drawn
  function animate() {
    console.log("animate");
    CLIP_PATH.select("rect")
      .transition()
      .duration(3000)
      .attr("width", CHART_WIDTH + 2 * EDGE_PADDING);
  }

  // Flatten data for use with scales
  function flatten() {
    for (let i = 0; i < DATA_MESSAGE.Charities.length; i++) {
      DATA_MESSAGE.Charities[i].ID = DATA_MESSAGE.Charities[i].Category.replace(
        / /g,
        "_"
      ).replace(/,/g, "");

      for (let j = 0; j < DATA_MESSAGE.Charities[i].Totals.length; j++) {
        DATA_MESSAGE.Charities[i].Totals[j].Date = TIME_PARSE(
          DATA_MESSAGE.Charities[i].Totals[j].Date
        );

        FLAT_DATA.push(DATA_MESSAGE.Charities[i].Totals[j]);
      }
    }
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

  animate();
});
