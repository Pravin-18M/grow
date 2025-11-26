const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Load Property model (case-sensitive path matches actual filename)
const Property = require('../models/Property');

const router = express.Router();

// --- Multer Storage (disk) ---
const uploadDir = path.join(__dirname, '..', 'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, uploadDir),
  filename: (req,file,cb)=> {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e6);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, unique + ext);
  }
});

// Accept only image MIME types
function imageFileFilter(req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Only image files are allowed'));
}

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { files: 10, fileSize: 15 * 1024 * 1024 }, // 15MB per file, max 10 files per request
});

// --- Helpers ---
function parseAmenities(raw) {
  if(!raw) return [];
  let values = [];
  if(Array.isArray(raw)) {
    values = raw.flatMap(v => typeof v === 'string' ? v.split(',') : []);
  } else if(typeof raw === 'string') {
    values = raw.split(',');
  }
  const cleaned = [...new Set(values.map(s => s.trim()).filter(Boolean))];
  return cleaned;
}

function buildFloorDetails(body){
  const {
    unitConfiguration,
    floorNumber,
    totalFloors,
    facing,
    parkingSlots
  } = body;
  // Only include if at least one field provided
  if(
    unitConfiguration || floorNumber !== undefined || totalFloors !== undefined ||
    facing || parkingSlots !== undefined
  ) {
    return {
      unitConfiguration,
      floorNumber: floorNumber ? Number(floorNumber) : undefined,
      totalFloors: totalFloors ? Number(totalFloors) : undefined,
      facing,
      parkingSlots: parkingSlots ? Number(parkingSlots) : undefined
    };
  }
  return undefined;
}

// --- CREATE Property ---
// Accept both 'images' and legacy 'images[]'
router.post('/', (req, res, next) => {
  const multiHandler = upload.any(); // We'll manually filter fields
  multiHandler(req, res, function (err) {
    if (err && (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT')) {
      return res.status(400).json({ success: false, message: 'You can upload a maximum of 10 images per property.' });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const {
      title, type, status, price, location, sqft,
      carpetArea, builtUpArea, description, customerCustId, closedDate
    } = req.body;

    if (!title || !type || !status || !price || !location) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Filter files for expected field names
    const receivedFiles = (req.files || []).filter(f => ['images','images[]'].includes(f.fieldname));
    const imagePaths = receivedFiles.map(f => '/uploads/' + path.basename(f.path));
    if(receivedFiles.length === 0) {
      console.warn('[CREATE] No image files received. Incoming field names:', (req.files||[]).map(f=>f.fieldname));
      return res.status(400).json({ success:false, message:'At least one image is required.' });
    } else {
      console.log('[CREATE] Stored images:', receivedFiles.map(f => ({ field:f.fieldname, name:f.originalname, saved:path.basename(f.path), size:f.size })));
    }
    const amenities = parseAmenities(req.body.amenities);
    const floorDetails = buildFloorDetails(req.body);

    const prop = new Property({
      title: title.trim(),
      type,
      status,
      price: Number(price),
      location: location.trim(),
      sqft: sqft ? Number(sqft) : undefined,
      carpetArea: carpetArea ? Number(carpetArea) : undefined,
      builtUpArea: builtUpArea ? Number(builtUpArea) : undefined,
      floorDetails,
      amenities,
      images: imagePaths,
      description: description || '',
      customerCustId: customerCustId || undefined,
      closedDate: closedDate ? new Date(closedDate) : undefined
    });

    await prop.save();
    res.status(201).json({ success: true, property: prop });
  } catch (err) {
    console.error('Property create error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- UPDATE Property ---
router.put('/:id', (req,res,next) => {
  const multiHandler = upload.any();
  multiHandler(req,res,function(err){
    if (err && (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT')) {
      return res.status(400).json({ success:false, message:'Maximum 10 images allowed.' });
    } else if (err) {
      return res.status(400).json({ success:false, message: err.message });
    }
    next();
  });
}, async (req,res)=> {
  try {
    const existing = await Property.findById(req.params.id);
    if(!existing) return res.status(404).json({ success:false, message:'Not found' });

    const {
      title, type, status, price, location, sqft,
      carpetArea, builtUpArea, description, replaceImages, customerCustId, closedDate
    } = req.body;

    if(title) existing.title = title.trim();
    if(type) existing.type = type;
    if(status) existing.status = status;
    if(price) existing.price = Number(price);
    if(location) existing.location = location.trim();
    if(sqft) existing.sqft = Number(sqft);
    if(carpetArea) existing.carpetArea = Number(carpetArea);
    if(builtUpArea) existing.builtUpArea = Number(builtUpArea);
    if(description !== undefined) existing.description = description;
    if(customerCustId !== undefined) existing.customerCustId = customerCustId || undefined;
    if(closedDate) existing.closedDate = new Date(closedDate);

    // Floor details rebuild if provided
    const floorDetails = buildFloorDetails(req.body);
    if(floorDetails) existing.floorDetails = floorDetails; 

    const amenities = parseAmenities(req.body.amenities);
    if(amenities.length) existing.amenities = amenities;

    const receivedFiles = (req.files || []).filter(f => ['images','images[]'].includes(f.fieldname));
    const newImages = receivedFiles.map(f => '/uploads/' + path.basename(f.path));
    const replaceRaw = String(req.body.replaceImages || '').toLowerCase();
    const doReplaceImages = ['true','on','1','yes'].includes(replaceRaw);

    if(doReplaceImages && !newImages.length) {
      return res.status(400).json({ success:false, message:'Replace requested but no new images uploaded.' });
    }

    if(newImages.length) {
      // Enforce combined limit of 10 images total
      if(!doReplaceImages && (existing.images.length + newImages.length) > 10) {
        // Cleanup newly stored files as they won't be referenced
        receivedFiles.forEach(f => {
          try { fs.unlinkSync(f.path); } catch(e) { console.warn('Cleanup failed for', f.path, e.message); }
        });
        return res.status(400).json({ success:false, message:'Adding these images exceeds the 10 image limit per property.' });
      }

      console.log('[UPDATE] New images:', receivedFiles.map(f => ({ field:f.fieldname, name:f.originalname, saved:path.basename(f.path), size:f.size })));

      if(doReplaceImages) {
        // Delete old image files from disk
        (existing.images || []).forEach(p => {
          const filePath = path.join(uploadDir, path.basename(p));
          if(fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch(e) { console.warn('Failed to delete old image', filePath, e.message); }
          }
        });
        existing.images = newImages;
      } else {
        existing.images.push(...newImages);
      }
    }

    await existing.save();
    res.json({ success:true, property: existing });
  } catch(err){
    console.error('Property update error:', err);
    res.status(500).json({ success:false, message:'Server error' });
  }
});

// --- LIST Properties ---
router.get('/', async (req,res)=> {
  try {
    const { type, status, search, minPrice, maxPrice, sort } = req.query;
    const filter = {};

    // Type filtering (support comma-separated list)
    if(type) {
      const types = type.split(',').map(t => t.trim()).filter(Boolean);
      if(types.length === 1) filter.type = types[0]; else if(types.length) filter.type = { $in: types };
    }

    // Status filtering (support comma-separated list)
    if(status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if(statuses.length === 1) filter.status = statuses[0]; else if(statuses.length) filter.status = { $in: statuses };
    }

    // Price range filtering
    if(minPrice || maxPrice) {
      filter.price = {};
      if(minPrice) filter.price.$gte = Number(minPrice);
      if(maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Text search (fallback to regex if index not ready yet)
    if(search) {
      const trimmed = search.trim();
      if(trimmed.length) {
        filter.$text = { $search: trimmed };
      }
    }

    // Sorting
    const sortMap = {
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      createdAsc: { createdAt: 1 },
      createdDesc: { createdAt: -1 },
      default: { createdAt: -1 }
    };
    const sortSpec = sortMap[sort] || sortMap.default;

    let query = Property.find(filter).sort(sortSpec).lean();

    // If using $text, optionally project score for potential future sorting by relevance
    if(filter.$text) {
      query = Property.find(filter, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' }, ...sortSpec }).lean();
    }

    const props = await query;
    res.json(props);
  } catch(err){
    console.error('Property list error:', err);
    res.status(500).json({ message:'Server error' });
  }
});

// --- GET Single Property ---
router.get('/:id', async (req,res)=> {
  try {
    const prop = await Property.findById(req.params.id).lean();
    if(!prop) return res.status(404).json({ message:'Not found' });
    res.json(prop);
  } catch(err){
    console.error('Property get error:', err);
    res.status(500).json({ message:'Server error' });
  }
});

// --- DELETE Property ---
router.delete('/:id', async (req,res)=> {
  try {
    const deleted = await Property.findByIdAndDelete(req.params.id);
    if(!deleted) return res.status(404).json({ message:'Not found' });
    res.json({ success:true });
  } catch(err){
    console.error('Property delete error:', err);
    res.status(500).json({ message:'Server error' });
  }
});

module.exports = router;