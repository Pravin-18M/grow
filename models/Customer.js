const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  custId: { type: String, unique: true, index: true }, // 4-digit style ID
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  dealType: { type: String, enum: ['Buy','Rent','JV','Investment','Consultation'], trim: true }, // transaction type
  req: { type: String, trim: true }, // high-level requirement summary
  description: { type: String, trim: true }, // detailed requirement notes
  bhk: { type: String, trim: true }, // e.g. 2BHK / 3BHK / Studio
  typology: { type: String, trim: true }, // e.g. Luxury / Premium / Affordable / Commercial
  propertyTypes: { type: [String], default: [] }, // multiple desired property types
  budget: { type: Number, default: 0 },
  status: { type: String, enum: ['New','Interested','Closed'], default: 'New' }
  ,
  notes: [
    {
      type: {
        type: String,
        enum: ['call','meeting','follow-up','general'],
        default: 'general'
      },
      text: { type: String, trim: true },
      followUpDate: { type: Date },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

// Generate unique CUST ID
function generateCustId() {
  // Generate a 4-digit numeric ID; retry on collision
  return Math.floor(1000 + Math.random() * 9000).toString();
}

CustomerSchema.pre('validate', async function(next){
  if(!this.custId){
    let unique = false;
    while(!unique){
      const id = generateCustId();
      const exists = await mongoose.models.Customer.findOne({ custId: id });
      if(!exists){
        this.custId = id;
        unique = true;
      }
    }
  }
  next();
});

// Prevent duplicate by phone
CustomerSchema.pre('save', async function(next){
  if(this.isNew){
    const existing = await mongoose.models.Customer.findOne({ phone: this.phone });
    if(existing){
      const err = new Error('Customer with this phone already exists (ID: ' + existing.custId + ').');
      err.code = 'DUPLICATE_PHONE';
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Customer', CustomerSchema);
