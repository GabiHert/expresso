# Sequelize Patterns

Common Sequelize ORM patterns used across Deel services.

## Connection Setup

Most services use `@deel-core/sequelize-flavours` for connection:

```javascript
const { initDb } = require('@deel-core/sequelize-flavours');
const db = initDb(config);
```

## Model Definition Pattern

```javascript
module.exports = (sequelize, DataTypes) => {
  const ModelName = sequelize.define('ModelName', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // ... fields
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'model_names',
    timestamps: true,
    underscored: true,
  });

  ModelName.associate = function(models) {
    ModelName.belongsTo(models.OtherModel, {
      foreignKey: 'other_model_id',
      as: 'otherModel',
    });
  };

  return ModelName;
};
```

## TypeScript Model Pattern (PEO style)

```typescript
import { Model, DataTypes, Sequelize } from 'sequelize';

export class MyModel extends Model {
  declare id: number;
  declare name: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    MyModel.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: DataTypes.STRING,
    }, {
      sequelize,
      tableName: 'my_models',
      underscored: true,
    });
  }

  static associate(models: any) {
    // associations
  }
}
```

## Common Query Patterns

### Find with associations
```javascript
const result = await Model.findOne({
  where: { id },
  include: [
    { model: OtherModel, as: 'alias' },
  ],
});
```

### Transactions
```javascript
const transaction = await sequelize.transaction();
try {
  await Model.create({ ... }, { transaction });
  await OtherModel.update({ ... }, { where: { ... }, transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### Bulk operations
```javascript
await Model.bulkCreate(items, {
  updateOnDuplicate: ['field1', 'field2'],
  transaction,
});
```

## Migration Pattern

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_name', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // ... columns
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('table_name', ['column_name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('table_name');
  },
};
```

## Scopes

```javascript
MyModel.addScope('active', {
  where: { status: 'active' },
});

MyModel.addScope('withRelations', {
  include: [{ model: OtherModel, as: 'relation' }],
});

// Usage
await MyModel.scope(['active', 'withRelations']).findAll();
```

## Hooks

```javascript
MyModel.beforeCreate(async (instance, options) => {
  // validation or transformation
});

MyModel.afterCreate(async (instance, options) => {
  // side effects, events
});
```

## Paranoid (Soft Delete)

```javascript
{
  paranoid: true,
  deletedAt: 'deleted_at',
}

// Soft delete
await instance.destroy();

// Force delete
await instance.destroy({ force: true });

// Include soft-deleted
await Model.findAll({ paranoid: false });
```
