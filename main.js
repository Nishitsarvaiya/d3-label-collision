import * as d3 from 'd3';

const ellipseForce = (padding, innerRepulsion, outerRepulsion) => {
	// from https://bl.ocks.org/jpurma/6dd2081cf25a5d2dfcdcab1a4868f237
	var nodes;
	function constant(x) {
		return function () {
			return x;
		};
	}

	if (typeof padding !== 'function') padding = constant(padding == null ? 4 : +padding);
	innerRepulsion = innerRepulsion == null ? 0.5 : +innerRepulsion;
	outerRepulsion = outerRepulsion == null ? 0.5 : +outerRepulsion;

	function force(alpha) {
		let i,
			j,
			n = nodes.length,
			// dimensions of this node
			node,
			my_padding,
			my_w,
			my_h,
			my_x,
			my_y,
			// often used multiples
			my_w2,
			my_h2,
			my_wh,
			// dimensions of the other node
			other,
			other_padding,
			other_w,
			other_h,
			other_x,
			other_y,
			// distance between nodes
			dist_x,
			dist_y,
			// components for the overall result
			force_ratio,
			dist,
			gap,
			repulsion,
			x_component,
			y_component,
			// computing elliptical force
			g,
			g2,
			x1,
			y1,
			x2,
			y2,
			d1,
			d2,
			force_ratio1,
			force_ratio2,
			// parameters
			myOuterRepulsion = outerRepulsion * 16;

		for (i = 0; i < n; ++i) {
			node = nodes[i];
			my_padding = +padding(node, i, nodes);
			my_w = node.rx + my_padding;
			my_h = node.ry + my_padding;
			my_w2 = my_w * my_w;
			my_h2 = my_h * my_h;
			my_wh = my_w * my_h;
			my_x = node.x + node.vx;
			my_y = node.y + node.vy;

			for (j = 0; j < n; ++j) {
				if (j == i) {
					continue;
				}
				other = nodes[j];
				other_padding = +padding(other, j, nodes);
				other_w = other.rx + other_padding;
				other_h = other.ry + other_padding;
				other_x = other.x + other.vx;
				other_y = other.y + other.vy;
				dist_x = my_x - other_x;
				dist_y = my_y - other_y;
				if (dist_x == 0 && dist_y == 0) {
					node.vx += Math.random() * 4 - 2;
					node.vy += Math.random() * 4 - 2;
					continue;
				} else if (dist_x == 0) {
					force_ratio = (my_h / my_w + other_h / other_w) / 2;
					dist = Math.abs(dist_y);
					gap = dist - my_h - other_h;
				} else if (dist_y == 0) {
					force_ratio = 1;
					dist = Math.abs(dist_x);
					gap = dist - my_w - other_w;
				} else {
					// ellipse is defined as  x^2   y^2
					//                        --- + --- = 1
					//                        w^2   h^2
					// here x,y are points on ellipse's arc.
					// we have a line going between center points of two ellipses and we want to know
					// the point where it crosses the ellipse's arc. Because we know the line, we
					// know that y = g * x, where
					g = dist_y / dist_x;
					// now the only unknown in ellipse above is x, and thus we can find it by
					// moving pieces around (pen and paper work). equation becomes:
					//             w * h
					// x = ---------------------
					//     sqrt(h^2 + g^2 * w^2)

					g2 = g * g;
					x1 = my_wh / Math.sqrt(my_h2 + g2 * my_w2);
					y1 = g * x1;
					// the length of the little bit from the center of ellipse to its margin.
					// For circle it would be 'r', but for ellipse it varies.
					d1 = Math.sqrt(x1 * x1 + y1 * y1);
					// Strength of force that this ellipse eminates is modified by ratio of this bit
					// to the ellipse's width. (It doesn't matter if we use width or height as reference
					// point)
					force_ratio1 = d1 / my_w;
					// And same for the other ellipse:
					x2 = (other_w * other_h) / Math.sqrt(other_h * other_h + g2 * other_w * other_w);
					y2 = g * x2;
					d2 = Math.sqrt(x2 * x2 + y2 * y2);
					force_ratio2 = d2 / other_w;
					// now we can calculate the gap or overlap between two ellipses, and force ratio on
					// how strongly they should push as average of their force_ratios
					dist = Math.sqrt(dist_x * dist_x + dist_y * dist_y);
					gap = dist - d2 - d1;
					force_ratio = (force_ratio1 + force_ratio2) / 2;
				}
				x_component = dist_x / dist;
				y_component = dist_y / dist;
				if (gap < 0) {
					// force GROWS as gap goes further into negative
					repulsion = Math.min(Math.max(1.0, innerRepulsion * force_ratio * -gap), 5.0);
					node.vx += repulsion * x_component;
					node.vy += repulsion * y_component;
				} else {
					// force DIMINISHES as gap becomes larger
					repulsion = Math.min(20.0, (force_ratio * myOuterRepulsion * alpha) / gap);
					node.vx += repulsion * x_component;
					node.vy += repulsion * y_component;
				}
			}
		}
	}

	force.initialize = function (my_nodes) {
		nodes = my_nodes;
	};

	force.outerRepulsion = function (my_outerRepulsion) {
		if (arguments.length) {
			outerRepulsion = +my_outerRepulsion;
			return force;
		} else {
			return outerRepulsion;
		}
	};

	force.innerRepulsion = function (my_innerRepulsion) {
		if (arguments.length) {
			innerRepulsion = +my_innerRepulsion;
			return force;
		} else {
			return innerRepulsion;
		}
	};

	force.padding = function (my_padding) {
		if (arguments.length) {
			if (typeof my_padding === 'function') {
				padding = my_padding;
			} else {
				padding = constant(+my_padding);
			}
			return force;
		} else {
			return padding;
		}
	};

	return force;
};

const linkTargetByEllipse = (sx, sy, tx, ty, rx, ry) => {
	// sx, sy = link source pos (fixed)
	// tx, ty = link target pos
	// rx, ry = label buffer ellipse radii

	// get x/y distances
	let dx = Math.abs(sx - tx);
	let dy = Math.abs(sy - ty);

	// arc tangent in radians
	let t = Math.atan(dy / dx);

	// get ellipse x/y position based on angle (radians)
	let ex = (rx * ry) / Math.sqrt(ry * ry + rx * rx * Math.pow(Math.tan(t), 2));
	let ey = (rx * ry) / Math.sqrt(rx * rx + (ry * ry) / Math.pow(Math.tan(t), 2));

	// new link larget x/y postion offset the from the center point.
	let nx = sx > tx ? tx + ex : tx - ex;
	let ny = sy > ty ? ty + ey : ty - ey;

	return [nx, ny];
};

/** ====================
 * ENTRYPOINT
======================*/

let data = [];
//let result = {}

for (let i = 1; i <= 10; i++) {
	let name = `Label ${i}`;
	let offset_x = Math.ceil(Math.random() * 100) * (Math.round(Math.random()) ? 1 : -1);
	let offset_y = Math.ceil(Math.random() * 60) * (Math.round(Math.random()) ? 1 : -1);
	data.push({ name, offset_x, offset_y });
}

console.log(data);

let height = 400;
let width = 600;
let paddingPoint = 10; // standard padding for fixed points
let paddingEllipseForce = 2; // padding between nodes on ellipseForce
let chartid = 'example';
let paddingLabel = 6;

// generate node/link data from set of points
let dataNodes = [];
let dataLinks = [];

data.map((d) => {
	// generate unique id if one doesn't exist
	let id = d.name.trim().toLowerCase().replace(/ /g, '-');

	// Process x/y posiiooffset from sample data to viz size
	let x = width / 2 + d.offset_x;
	let y = height / 2 + d.offset_y;

	// If using map projection you can map also map lat/lon to the x/x values or use other scale
	// let x = projection([d.lon, d.lat])[0]
	// let y = projection([d.lon, d.lat])[1]

	// Generate additional nodes for fixed points and links if active
	// ix/iy (initial x/y) copy the data location and are used in
	// forceX/Y to pull nodes toward their their initial position.
	// gid (group id) is used to isolated the point/leader/label pairs on hover
	dataNodes.push(Object.assign({ id, gid: id, x, y, ix: x, iy: y, type: 'point', fixed: true }, d));
	dataLinks.push({ source: id, target: `${id}_label`, gid: id });
	dataNodes.push(Object.assign({ id: id + '_label', gid: id, x, y, ix: x, iy: y, type: 'label' }, d));
});

const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);

const simulation = d3
	.forceSimulation(dataNodes)
	.force(
		'x',
		d3.forceX().x((d) => d.x)
	)
	.force(
		'y',
		d3.forceY().y((d) => d.y)
	)
	.on('tick', ticked);

// only apply forces if using links/leaders so labels
// will sit as close as possible to the target x/y position
simulation.force(
	'charge',
	d3.forceManyBody().strength((d) => (d.type === 'point' ? 0 : -60))
);
simulation.force(
	'link',
	d3
		.forceLink(dataLinks)
		.id((d) => d.id)
		.strength(0.25)
);

// Group for all elements
const forcelabels = svg.append('g').attr('class', 'forcelabels');

// Group for links
const links = forcelabels.append('g').attr('class', 'links');

const link = links.selectAll('line.link').data(dataLinks).join('line').attr('class', 'link').attr('stroke-width', 1).attr('stroke', '#999');

// Nodes Group
const nodes = forcelabels.append('g').attr('class', 'nodes');

// Points
const point = nodes
	.selectAll('g.point')
	.data(dataNodes.filter((d) => d.type == 'point'))
	.join('g')
	.attr('class', 'point')
	.attr('transform', (d) => {
		d.fx = d.x; // set fixed position on points
		d.fy = d.y;
		return `translate(${d.x},${d.y} )`;
	});

point.append('circle').attr('r', 3).attr('fill', '#555');

// Labels
const label = nodes
	.selectAll('g.label')
	.data(dataNodes.filter((d) => d.type == 'label'))
	.join('g')
	.attr('transform', (d) => `translate(${d.x},${d.y})`)
	.attr('class', 'label')
	.call(drag(simulation))
	.on('mouseover', (event, d) => {
		d3.select(event.target).style('cursor', 'pointer');
		link.transition().style('opacity', (g) => {
			return g.gid === d.gid ? 1 : 0.2;
		});
		point.transition().style('opacity', (g) => {
			return g.gid === d.gid ? 1 : 0.2;
		});
		label.transition().style('opacity', (g) => {
			return g.gid === d.gid ? 1 : 0.2;
		});
	})
	.on('mouseout', (event, d) => {
		d3.select(event.target).style('cursor', 'default');
		link.transition().style('opacity', 1);
		point.transition().style('opacity', 1);
		label.transition().style('opacity', 1);
	});

label
	.append('text')
	.attr('class', 'text')
	.text((d) => d.name)
	.attr('fill', '#333')
	.attr('text-anchor', 'middle')
	.attr('alignment-baseline', 'middle')
	.style('font-size', '.75em');

let firstTick = true;

let firstTickAction = function () {
	// Set the ellipse radii base on the text bounding box
	label.select(function (d, i) {
		d.bbox = this.getBBox(); // get bound of label groups based on text size
		// d.width = d.bbox.width;
		// d.height = d.bbox.height;
		d.rx = d.bbox.width / 2 + paddingLabel;
		d.ry = d.bbox.height / 2 + paddingLabel;
	});
	// Set a basic buffer on the points
	point.select(function (d, i) {
		d.rx = paddingPoint;
		d.ry = paddingPoint;
	});

	// Draw ellipse to show buffer for testing
	label
		.append('ellipse')
		.attr('class', 'ellipse')
		.attr('rx', function (d) {
			return d.rx;
		})
		.attr('ry', function (d) {
			return d.ry;
		})
		.attr('fill', 'none')
		.attr('stroke', '#DEDEDE');

	point
		.append('ellipse')
		.attr('class', 'ellipse')
		.attr('rx', function (d) {
			return d.rx;
		})
		.attr('ry', function (d) {
			return d.ry;
		})
		.attr('fill', 'none')
		.attr('stroke', '#DEDEDE');

	simulation.force('ellipseForce', ellipseForce(paddingEllipseForce, 0.05, 0.05)); // add ellipseForce

	firstTick = false; // only run once
};

function ticked() {
	if (firstTick) {
		firstTickAction();
	}

	label.attr('transform', (d) => `translate(${d.x}, ${d.y})`);

	// calculate new position of buffer
	link.select(function (d) {
		d.epoint = linkTargetByEllipse(d.source.x, d.source.y, d.target.x, d.target.y, d.target.rx, d.target.ry);
	});

	link.attr('x1', (d) => d.source.x)
		.attr('y1', (d) => d.source.y)
		.attr('x2', (d) => d.epoint[0])
		.attr('y2', (d) => d.epoint[1]);
}

function drag(simulation) {
	function dragstarted(event) {
		if (!event.active) simulation.alphaTarget(0.3).restart();
		event.subject.fx = event.subject.x;
		event.subject.fy = event.subject.y;
	}
	function dragged(event) {
		event.subject.fx = event.x;
		event.subject.fy = event.y;
	}
	function dragended(event) {
		if (!event.active) simulation.alphaTarget(0);
		event.subject.fx = null;
		event.subject.fy = null;
	}
	return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
}

console.log(svg.node());
document.getElementById('app').append(svg.node());
