import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MindMapVisualizer = ({ mindMapData, loading, error }) => {
  const svgRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!mindMapData || !svgRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .attr("viewBox", [0, 0, containerWidth, containerHeight]);

    svg.selectAll("*").remove(); // clear before drawing

    const g = svg.append("g");

    // --- Node Sizing based on text ---
    // Create temporary invisible labels to measure their width and height
    const tempLabels = g.append("g")
      .selectAll("text")
      .data(mindMapData.nodes)
      .join("text")
      .text(d => d.label)
      .attr("font-size", "14px")
      .attr("font-weight", "600")
      .attr("visibility", "hidden");

    // Compute radius needed for each node based on text size
    mindMapData.nodes.forEach((d, i) => {
      const textElem = tempLabels.nodes()[i];
      const bbox = textElem.getBBox(); // Get bounding box for text
      const textWidth = bbox.width;
      const textHeight = bbox.height;
      
      const minRadius = d.size ? d.size[0] / 2 : 30; // Minimum radius from data or default
      // Calculate radius to comfortably fit text with padding
      const computedRadius = Math.max(minRadius, Math.sqrt(textWidth * textWidth + textHeight * textHeight) / 2 + 15); // Add padding
      d.computedRadius = computedRadius;
    });

    // Remove temporary labels
    tempLabels.remove();


    // Setup force simulation
    const simulation = d3.forceSimulation(mindMapData.nodes)
      .force("link", d3.forceLink(mindMapData.edges).id(d => d.id).distance(d => d.length || 100))
      .force("charge", d3.forceManyBody().strength(-400)) // Increased repulsion for better spacing
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
      .force("collide", d3.forceCollide(d => d.computedRadius + 8)); // Increased collision padding

    // Draw edges
    const link = g.append("g")
      .attr("stroke-opacity", 0.8) // Slightly more opaque
      .selectAll("line")
      .data(mindMapData.edges)
      .join("line")
      .attr("stroke-width", d => Math.max(1.5, Math.sqrt(d.length / 8))) // Slightly thicker base, more variation
      .attr("stroke", d => d.color || "#666"); // Default to a darker grey

    // Edge labels
    const linkLabel = g.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(mindMapData.edges)
      .join("text")
      .text(d => d.label)
      .attr("font-size", "12px") // Increased font size for better visibility
      .attr("fill", "#000") // Changed to black for maximum contrast
      .attr("font-weight", "600") // Made bolder for better readability
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("pointer-events", "none"); // Make text unclickable

    // Draw nodes
    const node = g.append("g")
      .attr("stroke", "#fff") // White border for contrast
      .attr("stroke-width", 2.5) // Thicker border
      .selectAll("circle")
      .data(mindMapData.nodes)
      .join("circle")
      .attr("r", d => d.computedRadius)
      .attr("fill", d => d.color || "#3498db") // Solid fill from data color
      .style("filter", "drop-shadow(2px 2px 3px rgba(0,0,0,0.2))") // Subtle shadow for depth
      .call(drag(simulation));

    // Node labels centered
    const label = g.append("g")
      .attr("class", "node-labels")
      .selectAll("text")
      .data(mindMapData.nodes)
      .join("text")
      .text(d => d.label)
      .attr("font-size", "13px") // Slightly smaller, but still readable
      .attr("fill", "#ffffff") // White text for better contrast on colored nodes
      .attr("font-weight", "600") // Keep bold for readability
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("pointer-events", "none"); // Make text unclickable

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      linkLabel
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });

    // Zoom and Pan functionality
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4]) // Wider zoom range
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Clean up on unmount
    return () => {
      simulation.stop();
      svg.on(".zoom", null);
    };
  }, [mindMapData]); // Redraw when mindMapData changes

  // Drag behavior for nodes
  function drag(simulation) {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden relative"
    >
      {mindMapData ? (
        <svg ref={svgRef} className="w-full h-full"></svg>
      ) : (
        !loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xl">
            Your mind map will appear here.
          </div>
        )
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 text-blue-700 text-lg">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373
              0 0 5.373 0 12h4zm2 5.291A7.962
              7.962 0 014 12H0c0 3.042 1.135
              5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Generating the map...
        </div>
      )}

      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}
    </div>
  );
};

export default MindMapVisualizer;
