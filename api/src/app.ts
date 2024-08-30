import { errorHandler } from '@data-fair/lib/express/index.js'
import express from 'express'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')

app.set('json spaces', 2)
app.use(express.json())

app.use(errorHandler)
