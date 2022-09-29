const mongoose = require('mongoose')
const TaskCategory = require('./task-category-model')

const participantSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'user',
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'assigner'],
      default: 'assigner',
      required: true,
    },
    active: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { versionKey: false }
)

const taskSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'user',
    },
    completed: {
      type: Boolean,
      required: true,
      default: false,
    },
    completedBy: {
      type: mongoose.Types.ObjectId,
      ref: 'user',
    },
    startingDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endingDate: {
      type: Date,
    },
    participants: [participantSchema],
  },
  { versionKey: false }
)

taskSchema.pre('save', function (next) {
  if (!this.completed) {
    this.completedBy = undefined
    return next()
  }

  if (this.completed && this.completedBy) next()
  throw new ReqError('`completedBy` field is missing')
})

taskSchema.post('remove', function () {
  Promise.all([TaskCategory.deleteMany({ user: this._id })]).catch(() => {})
})

taskSchema.methods.getAllParticipants = function () {
  const participants = this.participants.map(({ user }) => user.toString())
  const mixedArray = [this.owner.toString(), participants].flat()
  return Array.from(new Set(mixedArray))
}

const hasPermission = roles => {
  return function (user) {
    const userId = user._id.toString()
    if (this.owner.toString() === userId) return true
    return this.participants.some(({ user, role, active }) => {
      return user.toString() === userId && active && roles.includes(role)
    })
  }
}

taskSchema.methods.isOwner = function (userId) {
  return this.owner.toString() === userId.toString()
}
taskSchema.methods.isAdmin = hasPermission(['admin'])
taskSchema.methods.isModerator = hasPermission(['admin', 'moderator'])
taskSchema.methods.isAssigner = hasPermission([
  'admin',
  'moderator',
  'assigner',
])

const taskModel = mongoose.model('task', taskSchema)
module.exports = taskModel
