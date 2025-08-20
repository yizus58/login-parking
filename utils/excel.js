const ExcelJS = require("exceljs");

async function generarExcelPorUsuario(data, opts = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const items = Array.isArray(data)
        ? data
        : (data && typeof data === "object" ? [data] : []);

    if (items.length === 0) {
        throw new TypeError("generarExcelPorUsuario: 'data' vacío o inválido");
    }

    for (const item of items) {
        const sheetName = (item.username || "usuario").substring(0, 31);
        const ws = workbook.addWorksheet(sheetName);

        const headerStyle = { bold: true };
        const currencyFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';

        ws.mergeCells("A1:E1");
        ws.getCell("A1").value = `Usuario: ${item.username || ""}  |  Parqueadero a cargo: ${item.parking || ""}`;
        ws.getCell("A1").font = { bold: true, size: 12 };

        ws.addRow([]);
        ws.addRow(["#", "Placa", "Modelo", "Fecha", "Costo"]);
        ws.getRow(3).font = headerStyle;
        ws.getRow(3).alignment = { vertical: "middle", horizontal: "center" };
        ws.getRow(3).height = 18;

        let rowIndex = 4;

        const vehsRaw =
            Array.isArray(item.vehiculos) ? item.vehiculos
                : Array.isArray(item.vehicles) ? item.vehicles
                    : (item.vehicles && typeof item.vehicles === "object" ? Object.values(item.vehicles) : []);

        (vehsRaw || []).forEach((v, i) => {
            const placa = v.placa ?? v.plate_number ?? "";
            const modelo = v.modelo ?? v.model_vehicle ?? "";

            const fechaVal = v.fecha ?? v.day ?? "";
            const fecha = fechaVal ? v.day : "";
            const costo = typeof v.costo === "number" ? v.costo
                : (typeof v.total_cost === "number" ? v.total_cost : null);

            ws.addRow([
                i + 1,
                placa,
                modelo,
                fecha,
                costo
            ]);

            ws.getCell(`D${rowIndex}`).numFmt = "yyyy-mm-dd-hh:mm:ss";
            ws.getCell(`E${rowIndex}`).numFmt = currencyFmt;
            rowIndex++;
        });

        const inicioDatos = 4;
        const finDatos = rowIndex - 1;
        if (finDatos >= inicioDatos) {
            ws.addRow([]);
            const subtotalRow = ws.addRow(["", "", "", "Subtotal:", { formula: `SUM(E${inicioDatos}:E${finDatos})` }]);
            subtotalRow.getCell(5).numFmt = currencyFmt;
            subtotalRow.font = { bold: true };
        } else {
            ws.addRow([]);
            ws.addRow(["Sin registros de vehículos"]);
        }

        const colWidths = [5, 15, 25, 15, 15];
        colWidths.forEach((w, idx) => (ws.getColumn(idx + 1).width = w));

        ws.autoFilter = {
            from: { row: 3, column: 1 },
            to: { row: 3, column: 5 }
        };
    }

    if (opts.filePath) {
        await workbook.xlsx.writeFile(opts.filePath);
        return;
    } else {
        return await workbook.xlsx.writeBuffer();
    }
}

module.exports = { generarExcelPorUsuario };