// Set up the SVG area
const width = document.getElementById('visualization').clientWidth;
const height = document.getElementById('visualization').clientHeight;

const svg = d3.select('#visualization')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

// Tooltip Div
const tooltip = d3.select('#tooltip');

// Load the data
d3.json('data.json').then(data => {
  // Data Preparation
  const nodes = data.nodes;
  const links = data.links;

  // Extract country information from the 'country' field
  nodes.forEach(node => {
    node.affiliation = node.country; // Since 'country' contains the affiliation info
    node.country = extractCountry(node.country);
  });

  // Calculate Node Degrees
  const nodeDegrees = {};
  links.forEach(link => {
    nodeDegrees[link.source] = (nodeDegrees[link.source] || 0) + 1;
    nodeDegrees[link.target] = (nodeDegrees[link.target] || 0) + 1;
  });

  // Define Node Size Scale
  const degreeValues = Object.values(nodeDegrees);
  const sizeScale = d3.scaleSqrt()
    .domain([d3.min(degreeValues), d3.max(degreeValues)])
    .range([3, 12]);

  // Identify Top 10 Countries
  const countryCounts = d3.rollup(nodes, v => v.length, d => d.country);
  const topCountries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(d => d[0]);

  // Create Color Scale
  const colorScale = d3.scaleOrdinal()
    .domain(topCountries)
    .range(d3.schemeTableau10);

  // Initialize Forces
  let chargeStrength = +document.getElementById('chargeStrength').value;
  let collisionRadius = +document.getElementById('collisionRadius').value;
  let linkStrength = +document.getElementById('linkStrength').value;

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).strength(linkStrength))
    .force('charge', d3.forceManyBody().strength(chargeStrength))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => sizeScale(nodeDegrees[d.id]) + collisionRadius));

  // Draw Links
  const linkElements = svg.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .enter().append('line')
    .attr('stroke', '#aaa');

  // Draw Nodes
  const nodeElements = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('circle')
    .data(nodes)
    .enter().append('circle')
    .attr('r', d => sizeScale(nodeDegrees[d.id] || 1))
    .attr('fill', d => topCountries.includes(d.country) ? colorScale(d.country) : '#A9A9A9')
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut)
    .on('click', handleClick)
    .call(drag(simulation));

  // Simulation Tick Function
  simulation.on('tick', () => {
    nodeElements
      .attr('cx', d => d.x = Math.max(sizeScale(nodeDegrees[d.id]), Math.min(width - sizeScale(nodeDegrees[d.id]), d.x)))
      .attr('cy', d => d.y = Math.max(sizeScale(nodeDegrees[d.id]), Math.min(height - sizeScale(nodeDegrees[d.id]), d.y)));

    linkElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
  });

  // Drag Functions
  function drag(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  // Mouseover Event Handler
  function handleMouseOver(event, d) {
    nodeElements.style('opacity', n => n.affiliation === d.affiliation ? 1 : 0.2);
    linkElements.style('opacity', 0.2);
  }

  // Mouseout Event Handler
  function handleMouseOut() {
    nodeElements.style('opacity', 1);
    linkElements.style('opacity', 1);
  }

  // Click Event Handler
  function handleClick(event, d) {
    tooltip.style('opacity', 1)
      .html(`<strong>${d.id}</strong><br>Affiliation: ${d.affiliation}`)
      .style('left', (event.pageX + 5) + 'px')
      .style('top', (event.pageY - 28) + 'px');
  }

  // Hide Tooltip on Outside Click
  svg.on('click', function(event) {
    if (event.target.tagName !== 'circle') {
      tooltip.style('opacity', 0);
    }
  });

  // Update Simulation on UI Input
  d3.select('#chargeStrength').on('input', function() {
    chargeStrength = +this.value;
    simulation.force('charge').strength(chargeStrength);
    simulation.alpha(1).restart();
  });

  d3.select('#collisionRadius').on('input', function() {
    collisionRadius = +this.value;
    simulation.force('collision').radius(d => sizeScale(nodeDegrees[d.id]) + collisionRadius);
    simulation.alpha(1).restart();
  });

  d3.select('#linkStrength').on('input', function() {
    linkStrength = +this.value;
    simulation.force('link').strength(linkStrength);
    simulation.alpha(1).restart();
  });

}).catch(error => {
  console.error('Error loading or processing data:', error);
});

// Function to extract country from the 'country' field
function extractCountry(affiliationString) {
  // Possible list of countries (add more as needed)
  const countries = ['China', 'Spain', 'France', 'Germany', 'USA', 'United Kingdom', 'UK', 'Japan', 'Canada', 'Italy', 'Australia', 'Switzerland', 'Netherlands', 'Sweden', 'India', 'Brazil'];

  // Try to find any of the countries in the affiliation string
  for (let country of countries) {
    if (affiliationString.includes(country)) {
      return country;
    }
  }
  // Default if no country is found
  return 'Unknown';
}
