import { useMemo, useRef, useState, useEffect } from 'react'
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
 * Center-merge Sankey: income on the RIGHT, outflows on the LEFT (RTL).
 * Labels are absolutely positioned over the SVG, right next to node bars.
 */

const NODE_W = 12
const NODE_GAP = 6
const MIN_NODE_H = 22
const PAD_Y = 24
const CENTER_W = 8
const SVG_INNER_W = 600

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
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgRect, setSvgRect] = useState<{ width: number; height: number; left: number; top: number } | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    const update = () => {
      const el = svgRef.current
      if (!el) return
      const box = el.getBoundingClientRect()
      const parent = el.parentElement?.getBoundingClientRect()
      if (!parent) return
      setSvgRect({
        width: box.width,
        height: box.height,
        left: box.left - parent.left,
        top: box.top - parent.top,
      })
    }
    const obs = new ResizeObserver(update)
    obs.observe(svgRef.current)
    update()
    return () => obs.disconnect()
  }, [])

  const layout = useMemo(() => {
    const income = incomeNodes.filter(n => n.value > 0)
    const outflow = outflowNodes.filter(n => n.value > 0)

    if (income.length === 0 && outflow.length === 0) return null

    const totalIncome = income.reduce((s, n) => s + n.value, 0)
    const totalOutflow = outflow.reduce((s, n) => s + n.value, 0)

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
    const baseH = maxNodes * 28 + (maxNodes - 1) * NODE_GAP + PAD_Y * 2
    const svgH = Math.max(140, Math.min(baseH, 240))
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

    const incomeCol = SVG_INNER_W - NODE_W
    const outflowCol = 0

    const incomePositioned = positionColumn(income, incomeHeights)
    const outflowPositioned = positionColumn(outflow, outflowHeights)

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
    const centerX = SVG_INNER_W / 2

    const incomeRibbons: { d: string; color: string }[] = []
    let centerIncomeY = centerTop
    const centerRightX = centerX + CENTER_W / 2
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

    const outflowRibbons: { d: string; color: string }[] = []
    let centerOutflowY = centerTop
    const centerLeftX = centerX - CENTER_W / 2
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
      centerTop, centerH, centerX,
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
    centerTop, centerH, centerX,
  } = layout

  // Compute scale from SVG viewBox to actual rendered pixels
  const scaleX = svgRect ? svgRect.width / SVG_INNER_W : 0
  const scaleY = svgRect ? svgRect.height / svgH : 0

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

      <div className="sankey-body">
        {/* SVG flow area */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_INNER_W} ${svgH}`}
          className="sankey-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {incomeRibbons.map((r, i) => (
            <path key={`i${i}`} d={r.d} fill={r.color} opacity={0.18} className="sankey-link" />
          ))}
          {outflowRibbons.map((r, i) => (
            <path key={`o${i}`} d={r.d} fill={r.color} opacity={0.18} className="sankey-link" />
          ))}

          {/* Node bars */}
          {incomePositioned.map(n => (
            <rect key={n.id} x={SVG_INNER_W - NODE_W} y={n.y} width={NODE_W} height={n.h} rx={4} fill={n.color} />
          ))}
          {outflowPositioned.map(n => (
            <rect key={n.id} x={0} y={n.y} width={NODE_W} height={n.h} rx={4} fill={n.color} />
          ))}

          {/* Center bar */}
          <rect
            x={centerX - CENTER_W / 2}
            y={centerTop}
            width={CENTER_W}
            height={centerH}
            rx={4}
            fill="var(--border)"
          />
        </svg>

        {/* Right labels (income) — positioned next to bars */}
        {svgRect && incomePositioned.map(n => {
          const top = svgRect.top + n.y * scaleY + (n.h * scaleY) / 2
          const right = svgRect.width - (SVG_INNER_W - NODE_W) * scaleX + svgRect.left + 6
          return (
            <div
              key={n.id}
              className="sankey-label-item sankey-label-right"
              style={{ top, right }}
            >
              <span className="sankey-label-name">{n.label}</span>
              <span className="sankey-label-val" dir="ltr">{formatValue(n.value)}</span>
            </div>
          )
        })}

        {/* Left labels (outflow) — positioned next to bars */}
        {svgRect && outflowPositioned.map(n => {
          const top = svgRect.top + n.y * scaleY + (n.h * scaleY) / 2
          const left = svgRect.left + NODE_W * scaleX + 6
          return (
            <div
              key={n.id}
              className="sankey-label-item sankey-label-left"
              style={{ top, left }}
            >
              <span className="sankey-label-name">{n.label}</span>
              <span className="sankey-label-val" dir="ltr">{formatValue(n.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
