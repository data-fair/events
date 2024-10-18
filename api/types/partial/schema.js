export default {
  $id: 'https://github.com/data-fair/events/partial',
  'x-exports': [],
  $defs: {
    modifier: {
      type: 'object',
      additionalProperties: false,
      required: [
        'date'
      ],
      readOnly: true,
      properties: {
        id: {
          type: 'string',
          description: 'Id of the user that created this issue'
        },
        name: {
          type: 'string',
          description: 'Name of the user that created this issue'
        },
        date: {
          type: 'string',
          description: 'Creation date of this issue',
          format: 'date-time'
        }
      }
    },
    senderSubscribe: {
      type: 'object',
      title: 'Emitter',
      additionalProperties: false,
      required: ['type', 'id'],
      properties: {
        type: {
          type: 'string',
          enum: ['user', 'organization'],
          title: 'Type'
        },
        id: {
          type: 'string',
          description: 'The unique id of the user or organization'
        },
        name: {
          type: 'string',
          description: 'The display name of the user or organization'
        },
        role: {
          type: 'string',
          deprecated: true,
          description: 'If this is set and owner is an organization, this restrict ownership to users of this organization having this role or admin role'
        },
        department: {
          type: 'string',
          description: 'If this is set and owner is an organization, this gives ownership to users of this organization that belong to this department'
        },
        departmentName: {
          type: 'string',
          description: 'The display name of the department'
        }
      }
    },
    recipient: {
      type: 'object',
      required: ['id'],
      readOnly: true,
      properties: {
        id: {
          type: 'string',
          description: 'The unique id of the user'
        },
        name: {
          type: 'string',
          description: 'The display name of the user'
        }
      }
    }
  }
}
