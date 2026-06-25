(function () {
  const STORAGE_KEY = "tp04-aeds3-produtos-bytes";
  const HEADER_SIZE = 4;
  const RECORD_HEADER_SIZE = 5;

  const FIELD_LABELS = {
    header: "cabecalho",
    tombstone: "lapide",
    size: "tamanho",
    id: "id",
    name: "nome",
    category: "categoria",
    price: "preco",
    stock: "estoque",
    padding: "sobra",
  };

  const dom = {
    form: document.getElementById("product-form"),
    formTitle: document.getElementById("form-title"),
    productId: document.getElementById("product-id"),
    name: document.getElementById("name"),
    category: document.getElementById("category"),
    price: document.getElementById("price"),
    stock: document.getElementById("stock"),
    saveBtn: document.getElementById("save-btn"),
    cancelEditBtn: document.getElementById("cancel-edit-btn"),
    seedBtn: document.getElementById("seed-btn"),
    resetBtn: document.getElementById("reset-btn"),
    searchInput: document.getElementById("search-input"),
    message: document.getElementById("message"),
    recordsBody: document.getElementById("records-body"),
    byteView: document.getElementById("byte-view"),
    recordDetails: document.getElementById("record-details"),
    legend: document.getElementById("legend"),
    statTotal: document.getElementById("stat-total"),
    statActive: document.getElementById("stat-active"),
    statDeleted: document.getElementById("stat-deleted"),
  };

  let selectedOffset = null;

  function concatBytes(parts) {
    let total = 0;
    for (let i = 0; i < parts.length; i += 1) {
      total += parts[i].length;
    }

    const bytes = new Int8Array(total);
    let offset = 0;

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      bytes.set(part, offset);
      offset += part.length;
    }

    return bytes;
  }

  function toSignedByte(value) {
    return value > 127 ? value - 256 : value;
  }

  function toHex(byte) {
    return (byte & 0xff).toString(16).toUpperCase().padStart(2, "0");
  }

  function loadFile() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return ByteStream.writeInt(0);
    }

    try {
      const values = JSON.parse(raw);
      if (!Array.isArray(values) || values.length < HEADER_SIZE) {
        throw new Error("Arquivo invalido.");
      }

      const bytes = new Int8Array(values.length);
      for (let i = 0; i < values.length; i += 1) {
        bytes[i] = toSignedByte(values[i]);
      }
      return bytes;
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      return ByteStream.writeInt(0);
    }
  }

  function saveFile(bytes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(bytes)));
  }

  function readLastId(bytes) {
    return ByteStream.readInt(bytes, 0);
  }

  function writeLastId(bytes, id) {
    bytes.set(ByteStream.writeInt(id), 0);
  }

  function stringByteLength(value) {
    return ByteStream.writeString(value).length;
  }

  function serializeProduct(product) {
    return concatBytes([
      ByteStream.writeInt(product.id),
      ByteStream.writeString(product.name),
      ByteStream.writeString(product.category),
      ByteStream.writeFloat(product.price),
      ByteStream.writeInt(product.stock),
    ]);
  }

  function deserializeProduct(payload, startOffset) {
    let cursor = 0;
    const fieldRanges = [];

    const id = ByteStream.readInt(payload, cursor);
    fieldRanges.push(range("id", startOffset + cursor, 4, id));
    cursor += 4;

    const nameSize = ByteStream.readShort(payload, cursor);
    const name = ByteStream.readString(payload, cursor);
    fieldRanges.push(range("name", startOffset + cursor, 2 + nameSize, name));
    cursor += 2 + nameSize;

    const categorySize = ByteStream.readShort(payload, cursor);
    const category = ByteStream.readString(payload, cursor);
    fieldRanges.push(range("category", startOffset + cursor, 2 + categorySize, category));
    cursor += 2 + categorySize;

    const price = ByteStream.readFloat(payload, cursor);
    fieldRanges.push(range("price", startOffset + cursor, 4, price.toFixed(2)));
    cursor += 4;

    const stock = ByteStream.readInt(payload, cursor);
    fieldRanges.push(range("stock", startOffset + cursor, 4, stock));

    return {
      product: { id, name, category, price, stock },
      fieldRanges,
    };
  }

  function range(field, offset, length, value) {
    return { field, offset, length, value };
  }

  function appendRecord(fileBytes, product) {
    const payload = serializeProduct(product);
    return concatBytes([
      fileBytes,
      ByteStream.writeByte(1),
      ByteStream.writeInt(payload.length),
      payload,
    ]);
  }

  function parseRecords(bytes) {
    const records = [];
    const byteInfo = [];
    let offset = 0;

    for (let i = 0; i < HEADER_SIZE; i += 1) {
      byteInfo[i] = range("header", i, 1, "ultimo ID = " + readLastId(bytes));
    }

    offset = HEADER_SIZE;
    while (offset + RECORD_HEADER_SIZE <= bytes.length) {
      const recordOffset = offset;
      const active = ByteStream.readByte(bytes, offset) === 1;
      byteInfo[offset] = range("tombstone", offset, 1, active ? "ativo" : "excluido");
      offset += 1;

      const size = ByteStream.readInt(bytes, offset);
      for (let i = 0; i < 4; i += 1) {
        byteInfo[offset + i] = range("size", offset + i, 1, size + " bytes");
      }
      offset += 4;

      const payloadOffset = offset;
      const payloadEnd = payloadOffset + size;
      if (payloadEnd > bytes.length) {
        break;
      }

      const payload = bytes.slice(payloadOffset, payloadEnd);
      const decoded = deserializeProduct(payload, payloadOffset);

      for (let r = 0; r < decoded.fieldRanges.length; r += 1) {
        const fieldRange = decoded.fieldRanges[r];
        for (let i = 0; i < fieldRange.length; i += 1) {
          byteInfo[fieldRange.offset + i] = fieldRange;
        }
      }

      const usedPayloadLength = serializeProduct(decoded.product).length;
      if (usedPayloadLength < size) {
        for (let i = payloadOffset + usedPayloadLength; i < payloadEnd; i += 1) {
          byteInfo[i] = range("padding", i, 1, "espaco nao usado");
        }
      }

      records.push({
        offset: recordOffset,
        size,
        active,
        product: decoded.product,
        payloadOffset,
      });

      offset = payloadEnd;
    }

    return { records, byteInfo };
  }

  function getActiveRecords() {
    const records = parseRecords(loadFile()).records;
    const activeRecords = [];

    for (let i = 0; i < records.length; i += 1) {
      if (records[i].active) {
        activeRecords.push(records[i]);
      }
    }

    return activeRecords;
  }

  function createProductFromForm(id) {
    const name = dom.name.value.trim();
    const category = dom.category.value.trim();
    const price = Number(dom.price.value);
    const stock = Number(dom.stock.value);

    if (!name || !category || !Number.isFinite(price) || !Number.isInteger(stock)) {
      throw new Error("Preencha todos os campos corretamente.");
    }

    if (stringByteLength(name) > 82 || stringByteLength(category) > 62) {
      throw new Error("Nome ou categoria ficaram longos demais para a visualizacao proposta.");
    }

    return { id, name, category, price, stock };
  }

  function insertProduct(event) {
    event.preventDefault();

    try {
      let bytes = loadFile();
      const editingId = Number(dom.productId.value);

      if (editingId) {
        const product = createProductFromForm(editingId);
        bytes = updateProduct(bytes, product);
        setMessage("Registro alterado: lapide antiga marcada e novo payload anexado.");
        clearForm();
      } else {
        const nextId = readLastId(bytes) + 1;
        const product = createProductFromForm(nextId);
        writeLastId(bytes, nextId);
        bytes = appendRecord(bytes, product);
        setMessage("Produto inserido no final do arquivo de bytes.");
        dom.form.reset();
      }

      saveFile(bytes);
      render();
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  function updateProduct(bytes, product) {
    const parsed = parseRecords(bytes);
    let current = null;

    for (let i = 0; i < parsed.records.length; i += 1) {
      const recordItem = parsed.records[i];
      if (recordItem.active && recordItem.product.id === product.id) {
        current = recordItem;
        break;
      }
    }

    if (!current) {
      throw new Error("Produto nao encontrado para alteracao.");
    }

    bytes[current.offset] = 0;
    return appendRecord(bytes, product);
  }

  function deleteProduct(id) {
    const bytes = loadFile();
    const records = parseRecords(bytes).records;
    let recordItem = null;

    for (let i = 0; i < records.length; i += 1) {
      if (records[i].active && records[i].product.id === id) {
        recordItem = records[i];
        break;
      }
    }

    if (!recordItem) {
      setMessage("Produto nao encontrado para exclusao.", true);
      return;
    }

    bytes[recordItem.offset] = 0;
    saveFile(bytes);
    setMessage("Registro excluido logicamente: a lapide mudou para 00.");
    render();
  }

  function editProduct(id) {
    const records = getActiveRecords();
    let recordItem = null;

    for (let i = 0; i < records.length; i += 1) {
      if (records[i].product.id === id) {
        recordItem = records[i];
        break;
      }
    }

    if (!recordItem) {
      setMessage("Produto nao encontrado para edicao.", true);
      return;
    }

    const product = recordItem.product;
    dom.productId.value = product.id;
    dom.name.value = product.name;
    dom.category.value = product.category;
    dom.price.value = product.price.toFixed(2);
    dom.stock.value = product.stock;
    dom.formTitle.textContent = "Alterar registro #" + product.id;
    dom.saveBtn.textContent = "Salvar alteracao";
    dom.form.classList.add("editing");
    dom.name.focus();
  }

  function clearForm() {
    dom.form.reset();
    dom.productId.value = "";
    dom.formTitle.textContent = "Inserir registro";
    dom.saveBtn.textContent = "Inserir";
    dom.form.classList.remove("editing");
  }

  function seedData() {
    let bytes = ByteStream.writeInt(0);
    const products = [
      { id: 1, name: "Mouse sem fio", category: "Perifericos", price: 89.9, stock: 14 },
      { id: 2, name: "SSD 1 TB", category: "Armazenamento", price: 399.9, stock: 7 },
      { id: 3, name: "Cabo USB-C", category: "Acessorios", price: 29.9, stock: 42 },
    ];

    writeLastId(bytes, products.length);
    for (let i = 0; i < products.length; i += 1) {
      bytes = appendRecord(bytes, products[i]);
    }

    saveFile(bytes);
    setMessage("Arquivo de exemplo carregado no LocalStorage.");
    clearForm();
    render();
  }

  function resetFile() {
    if (!confirm("Limpar todo o arquivo salvo no LocalStorage?")) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    selectedOffset = null;
    clearForm();
    setMessage("Arquivo reiniciado.");
    render();
  }

  function filteredRecords(records) {
    const term = dom.searchInput.value.trim().toLowerCase();
    if (!term) {
      return records;
    }

    const result = [];

    for (let i = 0; i < records.length; i += 1) {
      const recordItem = records[i];
      const product = recordItem.product;
      const found = String(product.id) === term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);

      if (found) {
        result.push(recordItem);
      }
    }

    return result;
  }

  function renderTable(records) {
    const visible = filteredRecords(records);

    if (visible.length === 0) {
      dom.recordsBody.innerHTML = '<tr><td colspan="7" class="muted">Nenhum registro encontrado.</td></tr>';
      return;
    }

    let html = "";

    for (let i = 0; i < visible.length; i += 1) {
      const recordItem = visible[i];
      const product = recordItem.product;
      const rowClass = recordItem.active ? "" : " class=\"row-deleted\"";
      const actions = recordItem.active
        ? '<button data-action="edit" data-id="' + product.id + '">Editar</button> ' +
          '<button data-action="delete" data-id="' + product.id + '" class="danger">Excluir</button>'
        : '<span class="muted">lapide 00</span>';

      html += '<tr' + rowClass + '>' +
        '<td>' + product.id + '</td>' +
        '<td>' + escapeHtml(product.name) + '</td>' +
        '<td>' + escapeHtml(product.category) + '</td>' +
        '<td>R$ ' + product.price.toFixed(2) + '</td>' +
        '<td>' + product.stock + '</td>' +
        '<td>' + recordItem.offset + '</td>' +
        '<td>' + actions + '</td>' +
        '</tr>';
    }

    dom.recordsBody.innerHTML = html;
  }

  function renderByteView(bytes, byteInfo) {
    let html = "";

    for (let offset = 0; offset < bytes.length; offset += 1) {
      const byte = bytes[offset];
      const info = byteInfo[offset] || range("padding", offset, 1, "desconhecido");
      const selected = selectedOffset === offset ? " selected" : "";
      html += '<button class="byte-cell field-' + info.field + selected + '" data-offset="' + offset + '">' +
        '<span class="byte-offset">' + offset + '</span>' +
        '<span class="byte-hex">' + toHex(byte) + '</span>' +
        '<span class="byte-field">' + FIELD_LABELS[info.field] + '</span>' +
        '</button>';
    }

    dom.byteView.innerHTML = html;
  }

  function renderLegend() {
    const fields = ["header", "tombstone", "size", "id", "name", "category", "price", "stock", "padding"];
    let html = "";

    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      html += '<span class="legend-item"><span class="swatch field-' + field + '"></span>' +
        FIELD_LABELS[field] + '</span>';
    }

    dom.legend.innerHTML = html;
  }

  function updateDetails(offset, bytes, byteInfo) {
    const info = byteInfo[offset];
    if (!info) {
      dom.recordDetails.textContent = "Offset " + offset + ": byte " + toHex(bytes[offset]) + ".";
      return;
    }

    dom.recordDetails.innerHTML =
      '<strong>Offset ' + offset + '</strong> - ' +
      FIELD_LABELS[info.field] +
      ' | byte hex <strong>' + toHex(bytes[offset]) + '</strong>' +
      ' | valor: <strong>' + escapeHtml(info.value) + '</strong>' +
      ' | campo inicia em ' + info.offset + ' e ocupa ' + info.length + ' byte(s).';
  }

  function renderStats(bytes, records) {
    let activeCount = 0;
    let deletedCount = 0;

    for (let i = 0; i < records.length; i += 1) {
      if (records[i].active) {
        activeCount += 1;
      } else {
        deletedCount += 1;
      }
    }

    dom.statTotal.textContent = bytes.length;
    dom.statActive.textContent = activeCount;
    dom.statDeleted.textContent = deletedCount;
  }

  function render() {
    const bytes = loadFile();
    const parsed = parseRecords(bytes);
    renderStats(bytes, parsed.records);
    renderTable(parsed.records);
    renderByteView(bytes, parsed.byteInfo);
    renderLegend();

    if (selectedOffset !== null && selectedOffset < bytes.length) {
      updateDetails(selectedOffset, bytes, parsed.byteInfo);
    }
  }

  function setMessage(text, isError) {
    dom.message.textContent = text;
    dom.message.classList.toggle("error", Boolean(isError));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  dom.form.addEventListener("submit", insertProduct);
  dom.cancelEditBtn.addEventListener("click", clearForm);
  dom.seedBtn.addEventListener("click", seedData);
  dom.resetBtn.addEventListener("click", resetFile);
  dom.searchInput.addEventListener("input", render);

  dom.recordsBody.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const id = Number(button.dataset.id);
    if (button.dataset.action === "edit") {
      editProduct(id);
    }
    if (button.dataset.action === "delete") {
      deleteProduct(id);
    }
  });

  dom.byteView.addEventListener("click", function (event) {
    const button = event.target.closest(".byte-cell");
    if (!button) {
      return;
    }

    selectedOffset = Number(button.dataset.offset);
    render();
  });

  render();
})();
