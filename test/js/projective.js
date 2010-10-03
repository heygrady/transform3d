/**
 * Projective texturing using Canvas.
 *
 * (c) Steven Wittens 2008
 * http://www.acko.net/
 */

var points = [
	[0, 0],
	[0 + 256, 0],
	[0, 0 + 256],
	[0 + 256, 0 + 256]
];

var options = {
	wireframe: true,
	image: 'http://www.iconarchive.com/icons/visualpharm/animals/256/Elephant-icon.png',
	subdivisionLimit: 5,
	patchSize: 64
};

var refresh, update;

(function () {
	
var $handles;
var drag = null;
var offset = null;
var canvas = null, ctx = null, transform = null;
var image = null, iw = 0, ih = 0;

$(document).ready(function () {
	init();
});

/**
 * Refresh image.
 */
refresh = function () {
	image = new Image();
	image.onload = update;
	image.src = options.image;
}

/**
 * Initialize the handles and canvas.
 */
function init() {
	// Position handles.
	$handles = $('div.handle').each(function (i) {
		this.index = i;
		$(this).css({
			left: points[this.index][0],
			top: points[this.index][1]
		});
	});
	
	// Install mouse handler for drag handles.
	$handles.mousedown(function (event) {
		drag = this.index;
		offset = { x: event.pageX - parseInt($(this).css('left')), y: event.pageY - parseInt($(this).css('top')) };
		return false;
	});

	// Install mouse capturing events.
	$(document).mousemove(function (event) {
		if (drag != null) {
			points[drag][0] = event.pageX - offset.x;
			points[drag][1] = event.pageY - offset.y;
			$handles[drag].style.left = points[drag][0] +'px';
			$handles[drag].style.top = points[drag][1] +'px';
			update();
		}
	}).mouseup(function () {
		drag = null;
	});

	// Create canvas and load image.
	canvas = createCanvas(0, 0, 1, 1);
	
	refresh();

	// Render image.
	update();
}

/**
 * Update the display to match a new point configuration.
 */
update = function () {
	// Get extents.
	var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
	$.each(points, function () {
		minX = Math.min(minX, Math.floor(this[0]));
		maxX = Math.max(maxX, Math.ceil(this[0]));
		minY = Math.min(minY, Math.floor(this[1]));
		maxY = Math.max(maxY, Math.ceil(this[1]));
	});
	
	minX--; minY--; maxX++; maxY++;
	var width = maxX - minX;
	var height = maxY - minY;

	// Reshape canvas.
	canvas.style.left = minX +'px';
	canvas.style.top = minY +'px';
	canvas.width = width;
	canvas.height = height;
	
	// Measure texture.
	iw = image.width;
	ih = image.height;

	// Set up basic drawing context.
	ctx = canvas.getContext("2d");
	ctx.translate(-minX, -minY);
	ctx.clearRect(minX, minY, width, height);
	ctx.strokeStyle = "rgb(220,0,100)";

	transform = getProjectiveTransform(points);
	

	// Begin subdivision process.
	var ptl = transform.transformProjectiveVector([0, 0, 1]);
	var ptr = transform.transformProjectiveVector([1, 0, 1]);
	var pbl = transform.transformProjectiveVector([0, 1, 1]);
	var pbr = transform.transformProjectiveVector([1, 1, 1]);
	
	//console.log(transform, ptl, ptr, pbl, pbr);
	
	//console.log(transform);
	//console.log(ptl, ptr, pbl, pbr);

	ctx.beginPath();
	ctx.moveTo(ptl[0], ptl[1]);
	ctx.lineTo(ptr[0], ptr[1]);
	ctx.lineTo(pbr[0], pbr[1]);
	ctx.lineTo(pbl[0], pbl[1]);
	ctx.closePath();
	ctx.clip();

	divide(0, 0, 1, 1, ptl, ptr, pbl, pbr, options.subdivisionLimit);

	if (options.wireframe) {
		ctx.beginPath();
		ctx.moveTo(ptl[0], ptl[1]);
		ctx.lineTo(ptr[0], ptr[1]);
		ctx.lineTo(pbr[0], pbr[1]);
		ctx.lineTo(pbl[0], pbl[1]);
		ctx.closePath();
		ctx.stroke();
	}

}

/**
 * Render a projective patch.
 */
function divide(u1, v1, u4, v4, tl, tr, bl, br, limit) {
	if (!(u1 == 0 && u4 == 1) && limit < options.subdivisionLimit - 2) {
		//console.log(tl, limit);
	} else if (limit < options.subdivisionLimit) {
		//console.log(tl, limit);
	}
	
	// See if we can still divide.
	if (limit) {
		// Measure patch non-affinity.
		var top = tr[0] + bl[0] - (2 * tl[0]),
			bottom = tr[0] + bl[0] - (2 * br[0]),
			left = tr[1] + bl[1] - (2 * tl[1]),
			right = tr[1] + bl[1] - (2 * br[1]),
			xDiff = top + bottom,
			yDiff = left + right;
		var r = Math.abs(
			(Math.pow(xDiff, 2) + Math.pow(yDiff, 2)) /
			(top * bottom + left * right)
		);
		//console.log(tl, tr, bl, br);
		//console.log('1:', tr[1], bl[1], tl[1], d1[1]);
		//console.log('2:', tr[1], bl[1], br[1], d2[1]);
		var area1 = 0.5 * Math.abs( ((tr[0] - tl[0]) * (bl[1] - tr[1])) - ((tr[0] - bl[0]) * (tl[1] - tr[1])) );
		var area2 = 0.5 * Math.abs( ((tr[0] - br[0]) * (bl[1] - tr[1])) - ((tr[0] - bl[0]) * (br[1] - tr[1])) );

		//console.log(area2, area2, area1 - area2);
		
		// Measure patch area.
		d1 = [tr[0] - tl[0] + br[0] - bl[0], tr[1] - tl[1] + br[1] - bl[1]];
		d2 = [bl[0] - tl[0] + br[0] - tr[0], bl[1] - tl[1] + br[1] - tr[1]];
		//console.log(d1, d2);
		var area = parseInt(Math.abs(d1[0] * d2[1] - d1[1] * d2[0]));

		if (limit == options.subdivisionLimit) {
			//console.log(.25 * area, parseInt(area1 + area2));
		}

		//console.log('r:', r, 'area', area);
		
		// Check area > patchSize pixels (note factor 4 due to not averaging d1 and d2)
		// The non-affinity measure is used as a correction factor.
		if (limit < options.subdivisionLimit && .25 * area > Math.pow(options.patchSize, 2)) {
			//console.log(.25 * area, Math.pow(options.patchSize, 2));
		}
		if ((u1 == 0 && u4 == 1) || ((.25 + r * 5) * area > (options.patchSize * options.patchSize))) {
			
			
			// Calculate subdivision points (middle, top, bottom, left, right).
			var umid = (u1 + u4) / 2;
			var vmid = (v1 + v4) / 2;
			var pmid = transform.transformProjectiveVector([umid, vmid, 1]);
			var pt = transform.transformProjectiveVector([umid, v1, 1]);
			var pb = transform.transformProjectiveVector([umid, v4, 1]);
			var pl = transform.transformProjectiveVector([u1, vmid, 1]);
			var pr = transform.transformProjectiveVector([u4, vmid, 1]);
			if ((u1 == 0 && u4 == 1)) {
				console.log('id:', pmid, pt, pb, pl, pr);
			}
			
			
			// Subdivide.
			limit--;
			divide(u1, v1, umid, vmid, tl, pt, pl, pmid, limit);
			divide(umid, v1, u4, vmid, pt, tr, pmid, pr, limit);
			divide(u1, vmid, umid, v4, pl, pmid, bl, pb, limit);
			divide(umid, vmid, u4, v4, pmid, pr, pb, br, limit);

			if (options.wireframe) {
				ctx.beginPath();
				ctx.moveTo(pt[0], pt[1]);
				ctx.lineTo(pb[0], pb[1]);
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(pl[0], pl[1]);
				ctx.lineTo(pr[0], pr[1]);
				ctx.stroke();
			}

			return; // yes, this subdivides but doesn't render
		}
	}

	// Render this patch.
	ctx.save();

	// Set clipping path.
	ctx.beginPath();
	ctx.moveTo(tl[0], tl[1]);
	ctx.lineTo(tr[0], tr[1]);
	ctx.lineTo(br[0], br[1]);
	ctx.lineTo(bl[0], bl[1]);
	ctx.closePath();
	//ctx.clip();
	
	// Get patch edge vectors.
	var d12 = [tr[0] - tl[0], tr[1] - tl[1]]; // top
	var d24 = [br[0] - tr[0], br[1] - tr[1]]; // right
	var d43 = [bl[0] - br[0], bl[1] - br[1]]; // bottom
	var d31 = [tl[0] - bl[0], tl[1] - bl[1]]; // left
	
	//console.log(d12, d24, d43, d31);
	
	// Find the corner that encloses the most area
	var a1 = Math.abs(d12[0] * d31[1] - d12[1] * d31[0]); // area top left
	var a2 = Math.abs(d24[0] * d12[1] - d24[1] * d12[0]); // area 
	var a4 = Math.abs(d43[0] * d24[1] - d43[1] * d24[0]);
	var a3 = Math.abs(d31[0] * d43[1] - d31[1] * d43[0]);
	var amax = Math.max(Math.max(a1, a2), Math.max(a3, a4));
	var dx = 0, dy = 0, padx = 0, pady = 0;
	
	//console.log(a1, a2, a3, a4);
		
	// Align the transform along this corner.
	switch (amax) {
		case a1:
			ctx.transform(d12[0], d12[1], -d31[0], -d31[1], tl[0], tl[1]);
			// Calculate 1.05 pixel padding on vector basis.
			if (u4 != 1) padx = 1.05 / Math.sqrt(d12[0] * d12[0] + d12[1] * d12[1]);
			if (v4 != 1) pady = 1.05 / Math.sqrt(d31[0] * d31[0] + d31[1] * d31[1]);
			break;
		case a2:
			ctx.transform(d12[0], d12[1],	d24[0],	d24[1], tr[0], tr[1]);
			// Calculate 1.05 pixel padding on vector basis.
			if (u4 != 1) padx = 1.05 / Math.sqrt(d12[0] * d12[0] + d12[1] * d12[1]);
			if (v4 != 1) pady = 1.05 / Math.sqrt(d24[0] * d24[0] + d24[1] * d24[1]);
			dx = -1;
			break;
		case a4:
			ctx.transform(-d43[0], -d43[1], d24[0], d24[1], br[0], br[1]);
			// Calculate 1.05 pixel padding on vector basis.
			if (u4 != 1) padx = 1.05 / Math.sqrt(d43[0] * d43[0] + d43[1] * d43[1]);
			if (v4 != 1) pady = 1.05 / Math.sqrt(d24[0] * d24[0] + d24[1] * d24[1]);
			dx = -1;
			dy = -1;
			break;
		case a3:
			// Calculate 1.05 pixel padding on vector basis.
			ctx.transform(-d43[0], -d43[1], -d31[0], -d31[1], bl[0], bl[1]);
			if (u4 != 1) padx = 1.05 / Math.sqrt(d43[0] * d43[0] + d43[1] * d43[1]);
			if (v4 != 1) pady = 1.05 / Math.sqrt(d31[0] * d31[0] + d31[1] * d31[1]);
			dy = -1;
			break;
	}
	
	// Calculate image padding to match.
	var du = (u4 - u1);
	var dv = (v4 - v1);
	var padu = padx * du;
	var padv = pady * dv;
	
	ctx.drawImage(
		image,
		u1 * iw,
		v1 * ih,
		Math.min(u4 - u1 + padu, 1) * iw,
		Math.min(v4 - v1 + padv, 1) * ih,
		dx, dy,
		1 + padx, 1 + pady
	);
	ctx.restore();
}

/**
 * Create a canvas at the specified coordinates.
 */
function createCanvas(x, y, width, height) {
	// Create <canvas>
	var canvas;
	if (typeof G_vmlCanvasManager != 'undefined') {
		canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		$('#canvas').appendChild(canvas);
		canvas = G_vmlCanvasManager.initElement(canvas);
	}
	else {
		canvas = $('<canvas width="'+ width +'" height="'+ height +'"></canvas>');
		$('#canvas').append(canvas);
		canvas = canvas[0];
	}

	return canvas;
}

/**
 * Calculate a projective transform that maps [0,1]x[0,1] onto the given set of points.
 */
function getProjectiveTransform(points) {
	var eqMatrix = new Matrix(9, 8, [
		[ 1, 1, 1,	 0, 0, 0, -points[3][0],-points[3][0],-points[3][0] ], 
		[ 0, 1, 1,	 0, 0, 0,	0,-points[2][0],-points[2][0] ],
		[ 1, 0, 1,	 0, 0, 0, -points[1][0], 0,-points[1][0] ],
		[ 0, 0, 1,	 0, 0, 0,	0, 0,-points[0][0] ],

		[ 0, 0, 0,	-1,-1,-1,	points[3][1], points[3][1], points[3][1] ],
		[ 0, 0, 0,	 0,-1,-1,	0, points[2][1], points[2][1] ],
		[ 0, 0, 0,	-1, 0,-1,	points[1][1], 0, points[1][1] ],
		[ 0, 0, 0,	 0, 0,-1,	0, 0, points[0][1] ]

	]);
	
	var kernel = eqMatrix.rowEchelon().values;
	var transform = new Matrix(3, 3, [
		[-kernel[0][8], -kernel[1][8], -kernel[2][8]],
		[-kernel[3][8], -kernel[4][8], -kernel[5][8]],
		[-kernel[6][8], -kernel[7][8],						 1]
	]);
	return transform;
}

})();
