const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    type: { 
        type: String, 
        required: true,
        enum: [
            'Apartment','Commercial','Villa','Land/Plot','Agriculture Land',
            'Individual House','Farmhouse','Warehouse','Retail Space','Industrial Plot'
        ]
    },
    status: { 
        type: String, 
        required: true,
        enum: ['Sale','Rent','Lease','JV']
    },
    price: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, trim: true },
    sqft: { type: Number }, // Generic square feet value
    carpetArea: { type: Number }, // For residential
    builtUpArea: { type: Number }, // For residential
    floorDetails: { // Only for Apartment / Individual House
        unitConfiguration: { type: String }, // e.g. 2BHK, 3BHK
        floorNumber: { type: Number },
        totalFloors: { type: Number },
        facing: { type: String }, // North/East/West/South
        parkingSlots: { type: Number }
    },
    amenities: { type: [String], default: [] }, // e.g. Club House, Park, Gym
    images: { type: [String], default: [] }, // Multiple image paths
    description: { type: String, default: '' },
    // Optional linkage to a customer when the transaction is associated
    customerCustId: { type: String, trim: true, index: true },
    closedDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Indexes for faster searches & text search
PropertySchema.index({ type: 1, status: 1, price: -1 });
PropertySchema.index({ customerCustId: 1 });
PropertySchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('Property', PropertySchema);