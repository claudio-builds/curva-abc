'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, BarChart3, Download, ArrowRight, Zap, Shield, Smartphone } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
} from 'recharts';

interface DataRow {
  codigo: string;
  descricao: string;
  valor: number;
  unidade?: string;
  quantidade?: number;
  custoUnitario?: number;
}

interface ABCItem extends DataRow {
  percentual: number;
  percentualAcumulado: number;
  classificacao: 'A' | 'B' | 'C';
  posicao: number;
}

const COLORS = {
  A: '#10b981',
  B: '#f59e0b', 
  C: '#ef4444',
};

export default function Home() {
  const [step, setStep] = useState<'upload' | 'columns' | 'results'>('upload');
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState({
    codigo: '',
    descricao: '',
    valor: '',
    unidade: '',
    quantidade: '',
    custoUnitario: '',
  });
  const [limiteA, setLimiteA] = useState(80);
  const [limiteB, setLimiteB] = useState(95);
  const [results, setResults] = useState<ABCItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [fileName, setFileName] = useState('');
  const [filterClass, setFilterClass] = useState<string[]>(['A', 'B', 'C']);
  const [searchTerm, setSearchTerm] = useState('');

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data.length > 0) {
            setRawData(result.data as Record<string, unknown>[]);
            setColumns(Object.keys(result.data[0] as Record<string, unknown>));
            autoDetectColumns(Object.keys(result.data[0] as Record<string, unknown>));
            setStep('columns');
          }
        },
      });
    } else if (['xlsx', 'xls'].includes(extension || '')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find "Sintética" sheet or use first
        let sheetName = workbook.SheetNames[0];
        for (const name of workbook.SheetNames) {
          if (name.toLowerCase().includes('sint')) {
            sheetName = name;
            break;
          }
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (jsonData.length > 0) {
          setRawData(jsonData as Record<string, unknown>[]);
          setColumns(Object.keys(jsonData[0] as Record<string, unknown>));
          autoDetectColumns(Object.keys(jsonData[0] as Record<string, unknown>));
          setStep('columns');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const autoDetectColumns = (cols: string[]) => {
    const detected = { codigo: '', descricao: '', valor: '', unidade: '', quantidade: '', custoUnitario: '' };
    
    const patterns = {
      codigo: ['código', 'codigo', 'cod', 'item', 'ref'],
      descricao: ['descrição', 'descricao', 'desc', 'serviço', 'servico'],
      valor: ['custo total', 'valor total', 'total', 'valor', 'custo'],
      unidade: ['unidade', 'unid', 'un', 'um'],
      quantidade: ['quantidade', 'quant', 'qtd', 'qtde'],
      custoUnitario: ['custo unitário', 'custo unitario', 'unitário', 'unitario', 'preço unit'],
    };

    for (const col of cols) {
      const colLower = col.toLowerCase();
      for (const [key, pats] of Object.entries(patterns)) {
        if (!detected[key as keyof typeof detected]) {
          for (const pat of pats) {
            if (colLower.includes(pat)) {
              detected[key as keyof typeof detected] = col;
              break;
            }
          }
        }
      }
    }

    setSelectedColumns(detected);
  };

  const parseNumber = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    let str = String(value).trim();
    str = str.replace(/[R$€£¥\s]/g, '');
    if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    return parseFloat(str) || 0;
  };

  const generateABC = () => {
    const { codigo, descricao, valor, quantidade, custoUnitario } = selectedColumns;
    
    if (!codigo || !descricao || !valor) {
      alert('Selecione as colunas obrigatórias: Código, Descrição e Valor');
      return;
    }

    // Process data
    const processed: DataRow[] = rawData
      .map((row) => {
        const valorNum = parseNumber(row[valor]);
        const qtdNum = quantidade ? parseNumber(row[quantidade]) : 0;
        const cuNum = custoUnitario ? parseNumber(row[custoUnitario]) : 0;
        
        let finalValue = valorNum;
        if (qtdNum > 0 && cuNum > 0) {
          finalValue = qtdNum * cuNum;
        }

        return {
          codigo: String(row[codigo] || '').trim(),
          descricao: String(row[descricao] || '').trim(),
          valor: finalValue,
          unidade: selectedColumns.unidade ? String(row[selectedColumns.unidade] || '') : undefined,
          quantidade: qtdNum || undefined,
          custoUnitario: cuNum || undefined,
        };
      })
      .filter((item) => item.valor > 0 && item.codigo);

    // Sort by value descending
    processed.sort((a, b) => b.valor - a.valor);

    // Calculate totals and percentages
    const total = processed.reduce((sum, item) => sum + item.valor, 0);
    setTotalValue(total);

    let accumulated = 0;
    const abcItems: ABCItem[] = processed.map((item, index) => {
      const percentual = (item.valor / total) * 100;
      accumulated += percentual;
      
      let classificacao: 'A' | 'B' | 'C' = 'C';
      if (accumulated <= limiteA) classificacao = 'A';
      else if (accumulated <= limiteB) classificacao = 'B';

      return {
        ...item,
        percentual,
        percentualAcumulado: accumulated,
        classificacao,
        posicao: index + 1,
      };
    });

    setResults(abcItems);
    setStep('results');
  };

  const downloadCSV = () => {
    const headers = ['Posição', 'Código', 'Descrição', 'Valor', '% Item', '% Acumulado', 'Classe'];
    const rows = results.map((item) => [
      item.posicao,
      item.codigo,
      `"${item.descricao}"`,
      item.valor.toFixed(2).replace('.', ','),
      item.percentual.toFixed(2).replace('.', ','),
      item.percentualAcumulado.toFixed(2).replace('.', ','),
      item.classificacao,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curva_abc_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const downloadExcel = () => {
    const wsData = [
      ['Posição', 'Código', 'Descrição', 'Valor', '% Item', '% Acumulado', 'Classe'],
      ...results.map((item) => [
        item.posicao,
        item.codigo,
        item.descricao,
        item.valor,
        item.percentual,
        item.percentualAcumulado,
        item.classificacao,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Curva ABC');
    XLSX.writeFile(wb, `curva_abc_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredResults = results.filter(
    (item) =>
      filterClass.includes(item.classificacao) &&
      (item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const classStats = {
    A: results.filter((r) => r.classificacao === 'A'),
    B: results.filter((r) => r.classificacao === 'B'),
    C: results.filter((r) => r.classificacao === 'C'),
  };

  const pieData = [
    { name: 'Classe A', value: classStats.A.reduce((s, i) => s + i.valor, 0), color: COLORS.A },
    { name: 'Classe B', value: classStats.B.reduce((s, i) => s + i.valor, 0), color: COLORS.B },
    { name: 'Classe C', value: classStats.C.reduce((s, i) => s + i.valor, 0), color: COLORS.C },
  ];

  const pieDataQtd = [
    { name: 'Classe A', value: classStats.A.length, color: COLORS.A },
    { name: 'Classe B', value: classStats.B.length, color: COLORS.B },
    { name: 'Classe C', value: classStats.C.length, color: COLORS.C },
  ];

  const paretoData = results.slice(0, 50).map((item) => ({
    name: item.codigo,
    valor: item.valor,
    acumulado: item.percentualAcumulado,
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">📊 Curva ABC Online</h1>
          <p className="text-xl text-violet-100 max-w-2xl mx-auto">
            Gere análises de Pareto para orçamentos de obras em segundos.
            Gratuito, sem cadastro, 100% no navegador.
          </p>
        </div>
      </header>

      {/* Features */}
      {step === 'upload' && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Zap, title: 'Instantâneo', desc: 'Processa no navegador' },
              { icon: FileSpreadsheet, title: 'Excel & CSV', desc: 'Detecta colunas auto' },
              { icon: Shield, title: 'Seguro', desc: 'Dados não saem do PC' },
              { icon: Smartphone, title: 'Responsivo', desc: 'Funciona no celular' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
                <f.icon className="w-8 h-8 mx-auto mb-3 text-violet-600" />
                <h3 className="font-semibold text-slate-800">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div className="flex justify-center items-center gap-4 mb-8 text-sm">
            {['Upload', 'Colunas', 'Resultados'].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  i === 0 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {i + 1}
                </span>
                <span className={i === 0 ? 'text-violet-600 font-medium' : 'text-slate-400'}>{s}</span>
                {i < 2 && <ArrowRight className="w-4 h-4 text-slate-300" />}
              </div>
            ))}
          </div>

          {/* Upload */}
          <div
            className="max-w-xl mx-auto bg-violet-50 border-2 border-dashed border-violet-300 rounded-2xl p-12 text-center cursor-pointer hover:border-violet-500 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) parseFile(file);
            }}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-violet-400" />
            <p className="text-lg font-medium text-slate-700 mb-2">
              Arraste sua planilha ou clique para selecionar
            </p>
            <p className="text-sm text-slate-500">Excel (.xlsx, .xls) ou CSV</p>
            <input
              id="fileInput"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
            />
          </div>
        </section>
      )}

      {/* Column Selection */}
      {step === 'columns' && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Confirme as Colunas</h2>
            <p className="text-slate-500 mb-6">
              Arquivo: <span className="font-medium text-slate-700">{fileName}</span> ({rawData.length} linhas)
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {[
                { key: 'codigo', label: 'Código *', required: true },
                { key: 'descricao', label: 'Descrição *', required: true },
                { key: 'valor', label: 'Valor Total *', required: true },
                { key: 'unidade', label: 'Unidade', required: false },
                { key: 'quantidade', label: 'Quantidade', required: false },
                { key: 'custoUnitario', label: 'Custo Unitário', required: false },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    value={selectedColumns[field.key as keyof typeof selectedColumns]}
                    onChange={(e) =>
                      setSelectedColumns({ ...selectedColumns, [field.key]: e.target.value })
                    }
                  >
                    <option value="">Selecione...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Limite A (%)</label>
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={limiteA}
                  onChange={(e) => setLimiteA(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Limite B (%)</label>
                <input
                  type="number"
                  min={limiteA + 1}
                  max={99}
                  value={limiteB}
                  onChange={(e) => setLimiteB(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                onClick={generateABC}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                🚀 Gerar Curva ABC
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {step === 'results' && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-violet-500">
              <p className="text-sm text-slate-500 uppercase tracking-wide">Total Itens</p>
              <p className="text-3xl font-bold text-slate-800">{results.length}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-emerald-500">
              <p className="text-sm text-slate-500 uppercase tracking-wide">Valor Total</p>
              <p className="text-2xl font-bold text-slate-800">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-emerald-500">
              <p className="text-sm text-slate-500 uppercase tracking-wide">Itens Classe A</p>
              <p className="text-3xl font-bold text-emerald-600">
                {classStats.A.length} <span className="text-lg font-normal text-slate-400">({((classStats.A.length / results.length) * 100).toFixed(0)}%)</span>
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-emerald-500">
              <p className="text-sm text-slate-500 uppercase tracking-wide">Valor Classe A</p>
              <p className="text-3xl font-bold text-emerald-600">
                {((classStats.A.reduce((s, i) => s + i.valor, 0) / totalValue) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Analysis */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 mb-8">
            <p className="text-lg">
              <strong>{classStats.A.length} itens</strong> ({((classStats.A.length / results.length) * 100).toFixed(0)}% do total)
              representam <strong>{((classStats.A.reduce((s, i) => s + i.valor, 0) / totalValue) * 100).toFixed(0)}%</strong> do valor.
              Foque nesses itens para maior impacto no controle de custos.
            </p>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Pareto Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">📈 Diagrama de Pareto</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={paretoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => {
                      const numValue = Number(value) || 0;
                      return [
                        name === 'valor' 
                          ? `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : `${numValue.toFixed(1)}%`,
                        name === 'valor' ? 'Valor' : '% Acumulado'
                      ];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="valor" fill="#8b5cf6" />
                  <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#10b981" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Charts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-2 text-center">💰 Por Valor</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${String(name || '').split(' ')[1] || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-2 text-center">📦 Por Quantidade</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieDataQtd}
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${String(name || '').split(' ')[1] || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {pieDataQtd.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-wrap gap-4 items-center">
              <h3 className="text-lg font-semibold">📋 Tabela Detalhada</h3>
              <div className="flex gap-2 ml-auto">
                {(['A', 'B', 'C'] as const).map((cls) => (
                  <button
                    key={cls}
                    onClick={() =>
                      setFilterClass((prev) =>
                        prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
                      )
                    }
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filterClass.includes(cls)
                        ? cls === 'A'
                          ? 'bg-emerald-500 text-white'
                          : cls === 'B'
                          ? 'bg-amber-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Código</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Descrição</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Valor</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">%</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">% Acum.</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Classe</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((item) => (
                    <tr key={item.posicao} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-500">{item.posicao}</td>
                      <td className="px-4 py-2 font-mono text-slate-700">{item.codigo}</td>
                      <td className="px-4 py-2 text-slate-700 max-w-xs truncate">{item.descricao}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-500">{item.percentual.toFixed(2)}%</td>
                      <td className="px-4 py-2 text-right text-slate-500">{item.percentualAcumulado.toFixed(2)}%</td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold text-white ${
                            item.classificacao === 'A'
                              ? 'bg-emerald-500'
                              : item.classificacao === 'B'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                        >
                          {item.classificacao}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex gap-4 mt-6 justify-center">
            <button
              onClick={() => { setStep('upload'); setResults([]); setRawData([]); }}
              className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50"
            >
              Nova Análise
            </button>
            <button
              onClick={downloadCSV}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 flex items-center gap-2"
            >
              <Download className="w-5 h-5" /> CSV
            </button>
            <button
              onClick={downloadExcel}
              className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 flex items-center gap-2"
            >
              <Download className="w-5 h-5" /> Excel
            </button>
          </div>
        </section>
      )}

      {/* Popify CTA */}
      <div className="max-w-xl mx-auto px-4 mt-12">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <p className="text-slate-700 font-medium">Quer aumentar suas vendas?</p>
          </div>
          <a
            href="https://popify-app.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all text-sm whitespace-nowrap"
          >
            Conheça o Popify →
          </a>
        </div>
      </div>

      {/* Interlinks Footer */}
      <div className="max-w-3xl mx-auto px-4 mt-12">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            🛠️ Mais Ferramentas Gratuitas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: "Calculadora MEI", desc: "Calcule seus impostos como MEI", url: "https://calculadora-mei-app.vercel.app", icon: "📊" },
              { name: "Calculadora de Preços", desc: "Forme o preço ideal do seu produto", url: "https://calculadora-preco-ten.vercel.app", icon: "💰" },
              { name: "Gerador de Recibos", desc: "Crie recibos profissionais grátis", url: "https://gerador-recibos-tau.vercel.app", icon: "🧾" },
              { name: "Gerador de Contratos", desc: "Contratos prontos para usar", url: "https://gerador-contratos-nu.vercel.app", icon: "📄" },
              { name: "Popify", desc: "Notificações de prova social para seu site", url: "https://popify-app.vercel.app", icon: "🔔" },
            ].map((tool) => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
              >
                <span className="text-xl mt-0.5">{tool.icon}</span>
                <div>
                  <p className="font-semibold text-slate-700 group-hover:text-violet-600 transition-colors text-sm">{tool.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{tool.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-400 text-sm border-t mt-12">
        <p>Desenvolvido com ❤️ para engenheiros e orçamentistas</p>
        <p className="mt-1">Curva ABC Online © {new Date().getFullYear()}</p>
        <p className="text-slate-300 text-xs mt-2">Ferramentas gratuitas por Claudio Tools</p>
      </footer>
    </main>
  );
}
