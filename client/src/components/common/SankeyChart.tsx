import { useMemo } from 'react'
import './SankeyChart.css'

export interface SankeyNode {
  id: string
  label: string
  value: number
  color: string
}

interface Props {
  incomeNodes: SankeyNode[]
  outflowNodes: SankeyNode[]
  incomeLabel: string
  outflowLabel: string
  formatValue: (n: number) => string
}

/*
 * Center-merge Sankey: income nodes on the right merge into a central
 * column, then fan out to outflow nodes on the left.
 * Only N + M ribbons instead of N × M — no thin cross-lines.
 * RTL-aware: income on the RIGHT, outflows on the LEFT.
 */

const SVG_W = 960
const NODE_W = 12
const NODE_GAP = 6
const MIN_NODE_H = 22
const LABEL_MARGIN = 170
const FLOW_LEFT = LABEL_MARGIN
const FLOW_RIGHT = SVG_W - LABEL_MARGIN
const CENTER_X = SVG_W / 2
const CENTER_W = 8
const LABEL_PAD = 10
const PAD_Y = 24

function bezierRibbon(
  x0: number, y0top: number, y0bot: number,
  x1: number, y1top: number, y1bot: number,
): string {
  const cx = (x0 + x1) / 2
  return [
    `M${x0},${y0top}`,
    `C${cx},${y0top} ${cx},${y1top} ${x1},${y1top}`,
    `L${x1},${y1bot}`,
    `C${cx},${y1bot} ${cx},${y0bot} ${x0},${y0bot}`,
    'Z',
  ].join(' ')
}

export function SankeyChart({ incomeNodes, outflowNodes, incomeLabel, outflowLabel, formatValue }: Props) {
  const layout = useMemo(() => {
    const income = incomeNodes.filter(n => n.value > 0)
    const outflow = outflowNodes.filter(n => n.value > 0)

    if (income.length === 0 && outflow.length === 0) return null

    const totalIncome = income.reduce((s, n) => s + n.value, 0)
    const totalOutflow = outflow.reduce((s, n) => s + n.value, 0)

    // sqrt scaling for visual balance
    function computeHeights(nodes: { value: number }[], availH: number) {
      if (nodes.length === 0) return []
      const usableH = availH - (nodes.length - 1) * NODE_GAP
      const sqrtSum = nodes.reduce((s, n) => s + Math.sqrt(n.value), 0)
      if (sqrtSum === 0) return nodes.map(() => MIN_NODE_H)
      return nodes.map(n => {
        const raw = (Math.sqrt(n.value) / sqrtSum) * usableH
        return Math.max(raw, MIN_NODE_H)
      })
    }

    const maxNodes = Math.max(income.length, outflow.length, 1)
    const baseH = maxNodes * 48 + (maxNodes - 1) * NODE_GAP + PAD_Y * 2
    const svgH = Math.max(300, baseH)
    const availH = svgH - PAD_Y * 2

    const incomeHeights = computeHeights(income, availH)
    const outflowHeights = computeHeights(outflow, availH)

    function positionColumn(nodes: SankeyNode[], heights: number[]) {
      const totalH = heights.reduce((s, h) => s + h, 0) + (heights.length - 1) * NODE_GAP
      let y = PAD_Y + (availH - totalH) / 2
      return nodes.map((node, i) => {
        const h = heights[i]
        const pos = { ...node, y, h }
        y += h + NODE_GAP
        return pos
      })
    }

    const incomeCol = FLOW_RIGHT - NODE_W
    const outflowCol = FLOW_LEFT

    const incomePositioned = positionColumn(income, incomeHeights)
    const outflowPositioned = positionColumn(outflow, outflowHeights)

    // Center column: a single merged bar spanning the union of both sides
    const allIncomeTop = incomePositioned.length > 0 ? incomePositioned[0].y : PAD_Y
    const allIncomeBot = incomePositioned.length > 0
      ? incomePositioned[incomePositioned.length - 1].y + incomePositioned[incomePositioned.length - 1].h
      : PAD_Y
    const allOutflowTop = outflowPositioned.length > 0 ? outflowPositioned[0].y : PAD_Y
    const allOutflowBot = outflowPositioned.length > 0
      ? outflowPositioned[outflowPositioned.length - 1].y + outflowPositioned[outflowPositioned.length - 1].h
      : PAD_Y

    const centerTop = Math.min(allIncomeTop, allOutflowTop)
    const centerBot = Math.max(allIncomeBot, allOutflowBot)
    const centerH = centerBot - centerTop

    // Build ribbons: each income node → center, each outflow node ← center
    // Income ribbons: from income node (right) to center-right edge
    const incomeRibbons: { d: string; color: string }[] = []
    let centerIncomeY = centerTop
    const centerRightX = CENTER_X + CENTER_W / 2

    // Distribute center space proportionally to income node heights
    const totalIncomeH = incomePositioned.reduce((s, n) => s + n.h, 0)
    for (const n of incomePositioned) {
      const share = totalIncomeH > 0 ? (n.h / totalIncomeH) * centerH : 0
      const d = bezierRibbon(
        centerRightX, centerIncomeY, centerIncomeY + share,
        incomeCol, n.y, n.y + n.h,
      )
      incomeRibbons.push({ d, color: n.color })
      centerIncomeY += share
    }

    // Outflow ribbons: from center-left edge to outflow node (left)
    const outflowRibbons: { d: string; color: string }[] = []
    let centerOutflowY = centerTop
    const centerLeftX = CENTER_X - CENTER_W / 2

    const totalOutflowH = outflowPositioned.reduce((s, n) => s + n.h, 0)
    for (const n of outflowPositioned) {
      const share = totalOutflowH > 0 ? (n.h / totalOutflowH) * centerH : 0
      const d = bezierRibbon(
        outflowCol + NODE_W, n.y, n.y + n.h,
        centerLeftX, centerOutflowY, centerOutflowY + share,
      )
      outflowRibbons.push({ d, color: n.color })
      centerOutflowY += share
    }

    return {
      incomePositioned, outflowPositioned,
      incomeRibbons, outflowRibbons,
      svgH, totalIncome, totalOutflow,
      incomeCol, outflowCol,
      centerTop, centerH,
    }
  }, [incomeNodes, outflowNodes])

  if (!layout) {
    return (
      <div className="chart-card">
        <h3>תזרים כספי</h3>
        <div className="section-empty">אין נתונים להצגה</div>
      </div>
    )
  }

  const {
    incomePositioned, outflowPositioned,
    incomeRibbons, outflowRibbons,
    svgH, totalIncome, totalOutflow,
    incomeCol, outflowCol,
    centerTop, centerH,
  } = layout

  return (
    <div className="chart-card sankey-card">
      <h3>תזרים כספי</h3>
      <div className="sankey-totals">
        <div className="sankey-total">
          <span className="sankey-total-label">{incomeLabel}</span>
          <span className="sankey-total-value sankey-total-income">{formatValue(totalIncome)}</span>
        </div>
        <div className="sankey-total sankey-total-end">
          <span className="sankey-total-label">{outflowLabel}</span>
          <span className="sankey-total-value sankey-total-outflow">{formatValue(totalOutflow)}</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        className="sankey-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Income ribbons (right side → center) */}
        {incomeRibbons.map((r, i) => (
          <path key={`i${i}`} d={r.d} fill={r.color} opacity={0.18} className="sankey-link" />
        ))}

        {/* Outflow ribbons (center → left side) */}
        {outflowRibbons.map((r, i) => (
          <path key={`o${i}`} d={r.d} fill={r.color} opacity={0.18} className="sankey-link" />
        ))}

        {/* Center bar */}
        <rect
          x={CENTER_X - CENTER_W / 2}
          y={centerTop}
          width={CENTER_W}
          height={centerH}
          rx={4}
          fill="var(--border)"
        />

        {/* Income nodes (RIGHT side) */}
        {incomePositioned.map(n => (
          <g key={n.id} className="sankey-node-group">
            <rect x={incomeCol} y={n.y} width={NODE_W} height={n.h} rx={4} fill={n.color} />
            <text
              x={incomeCol + NODE_W + LABEL_PAD}
              y={n.y + n.h / 2 - 1}
              textAnchor="start"
              dominantBaseline="central"
              className="sankey-node-label"
            >
              {n.label}
            </text>
            <text
              x={incomeCol + NODE_W + LABEL_PAD}
              y={n.y + n.h / 2 + 13}
              textAnchor="start"
              dominantBaseline="central"
              className="sankey-node-value"
              direction="ltr"
            >
              {formatValue(n.value)}
            </text>
          </g>
        ))}

        {/* Outflow nodes (LEFT side) */}
        {outflowPositioned.map(n => (
          <g key={n.id} className="sankey-node-group">
            <rect x={outflowCol} y={n.y} width={NODE_W} height={n.h} rx={4} fill={n.color} />
            <text
              x={outflowCol - LABEL_PAD}
              y={n.y + n.h / 2 - 1}
              textAnchor="end"
              dominantBaseline="central"
              className="sankey-node-label"
            >
              {n.label}
            </text>
            <text
              x={outflowCol - LABEL_PAD}
              y={n.y + n.h / 2 + 13}
              textAnchor="end"
              dominantBaseline="central"
              className="sankey-node-value"
              direction="ltr"
            >
              {formatValue(n.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
