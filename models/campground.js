const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Review = require('./review')

const imageSchema = new Schema({
    url: String,
    filename: String
})

imageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_150')    // this refers to particular image
})


const CampgroundSchema = new Schema({
    title: String,
    images: [imageSchema],
    price: Number,
    description: String,
    location: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
    // review is array while author is not 
    // this is because one campground can have
    // more than one review whereas it can have only one author
});

CampgroundSchema.post('findOneAndDelete', async function (data) {
    // console.log(data)
    if (data) {
        await Review.deleteMany({ _id: { $in: data.reviews } })
    }
})

module.exports = mongoose.model('Campground', CampgroundSchema);
