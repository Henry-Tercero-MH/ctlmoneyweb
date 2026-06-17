/** Categories.gs — CRUD de categorías. Las de sistema (is_system) no se borran. */

function listCategories_() {
  return readAll_('categories').sort(function (a, b) {
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  });
}

function createCategory_(payload, user) {
  if (!payload.id || !payload.name) throw new ApiErr('VALIDATION_ERROR', 'Datos de categoría incompletos.');
  if (['income', 'expense'].indexOf(payload.kind) === -1) {
    throw new ApiErr('VALIDATION_ERROR', 'kind inválido.');
  }
  var row = {
    id: payload.id,
    name: payload.name,
    kind: payload.kind,
    icon: payload.icon || 'tag',
    color: payload.color || '#d4a017',
    parent_id: payload.parent_id || '',
    is_system: false,
    sort_order: Number(payload.sort_order) || 999,
  };
  appendRow_('categories', row);
  audit_('createCategory', 'categories', row.id, payload, user.email);
  return row;
}

function updateCategory_(payload, user) {
  var existing = readAll_('categories').filter(function (c) { return c.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Categoría no encontrada.');
  var row = {
    id: payload.id,
    name: payload.name,
    kind: payload.kind || existing.kind,
    icon: payload.icon || existing.icon,
    color: payload.color || existing.color,
    parent_id: payload.parent_id || '',
    is_system: existing.is_system,
    sort_order: Number(payload.sort_order) || existing.sort_order,
  };
  updateRow_('categories', payload.id, row);
  audit_('updateCategory', 'categories', payload.id, payload, user.email);
  return row;
}

function deleteCategory_(payload, user) {
  var existing = readAll_('categories').filter(function (c) { return c.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Categoría no encontrada.');
  if (existing.is_system === true || existing.is_system === 'TRUE') {
    throw new ApiErr('VALIDATION_ERROR', 'No se puede eliminar una categoría de sistema.');
  }
  var inUse = readAll_('transactions').some(function (t) { return t.category_id === payload.id; });
  if (inUse) throw new ApiErr('VALIDATION_ERROR', 'La categoría tiene movimientos asociados.');
  deleteRow_('categories', payload.id);
  audit_('deleteCategory', 'categories', payload.id, payload, user.email);
  return { id: payload.id };
}
