// Non-destructive clip preparation. Times refer to the original source recording.
function plan(recipe, meta) {
    if (!Number.isFinite(meta.duration) || meta.duration <= 0 || !Number.isInteger(meta.width) || !Number.isInteger(meta.height))
        throw new Error('The source video metadata is unavailable.');
    const fps = Number(recipe.fps), start = Number(recipe.start), end = Number(recipe.end);
    if (!Number.isFinite(fps) || fps < 1 || fps > 1000 || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end / fps > meta.duration + 1 / fps)
        throw new Error('Choose a valid start and end within the recording.');
    const cuts = [...new Set(recipe.cuts || [])].sort((a, b) => a - b);
    if (cuts.length > 50 || cuts.some(f => !Number.isInteger(f) || f <= start || f >= end))
        throw new Error('Split points must be inside the trimmed range.');
    const crop = recipe.crop;
    if (crop && (!['x', 'y', 'width', 'height'].every(k => Number.isInteger(crop[k])) || crop.x < 0 || crop.y < 0 || crop.width < 2 || crop.height < 2 || crop.x + crop.width > meta.width || crop.y + crop.height > meta.height))
        throw new Error('The crop must stay within the source frame.');
    // Orientation is applied after the crop, in the order rotate (clockwise) then flip.
    const rotate = Number(recipe.rotate || 0), flipH = recipe.flipH === true, flipV = recipe.flipV === true;
    if (![0, 90, 180, 270].includes(rotate) || ![undefined, true, false].includes(recipe.flipH) || ![undefined, true, false].includes(recipe.flipV))
        throw new Error('Rotation must be 0, 90, 180 or 270 degrees, and flips must be on or off.');
    const orient = [];
    if (rotate === 90) orient.push('transpose=clock');
    else if (rotate === 270) orient.push('transpose=cclock');
    else if (rotate === 180) orient.push('hflip', 'vflip');
    if (flipH) orient.push('hflip');
    if (flipV) orient.push('vflip');
    const edges = [start, ...cuts, end];
    return edges.slice(0, -1).map((a, i) => {
        const filters = [`trim=start=${a / fps}:end=${edges[i + 1] / fps}`, 'setpts=PTS-STARTPTS'];
        // Video encoders require even dimensions. Round the far edges inward only.
        if (crop)
            filters.push(`crop=${crop.width - crop.width % 2}:${crop.height - crop.height % 2}:${crop.x}:${crop.y}:exact=1`);
        filters.push(...orient);
        return { start: a, end: edges[i + 1], filters: filters.join(',') };
    });
}
module.exports = { plan };
