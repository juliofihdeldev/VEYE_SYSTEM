import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

export type PendingReportStatus = 'sending' | 'success' | 'error'

export interface PendingReport {
  id: string
  rezon: string
  name: string
  status: PendingReportStatus
  createdAt: number
}

interface PendingReportContextType {
  pendingReports: PendingReport[]
  addPendingReport: (report: Omit<PendingReport, 'id' | 'status' | 'createdAt'>) => string
  updateReportStatus: (id: string, status: PendingReportStatus) => void
  removePendingReport: (id: string) => void
}

const PendingReportContext = createContext<PendingReportContextType>({
  pendingReports: [],
  addPendingReport: () => '',
  updateReportStatus: () => {},
  removePendingReport: () => {},
})

export function PendingReportProvider({ children }: { children: React.ReactNode }) {
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([])
  const counterRef = useRef(0)

  const addPendingReport = useCallback(
    (report: Omit<PendingReport, 'id' | 'status' | 'createdAt'>): string => {
      const id = `pending-${Date.now()}-${++counterRef.current}`
      setPendingReports(prev => [
        { ...report, id, status: 'sending', createdAt: Date.now() },
        ...prev,
      ])
      return id
    },
    [],
  )

  const updateReportStatus = useCallback((id: string, status: PendingReportStatus) => {
    setPendingReports(prev =>
      prev.map(r => (r.id === id ? { ...r, status } : r)),
    )
    // Auto-remove successful reports after 3 s
    if (status === 'success') {
      setTimeout(() => {
        setPendingReports(prev => prev.filter(r => r.id !== id))
      }, 3000)
    }
  }, [])

  const removePendingReport = useCallback((id: string) => {
    setPendingReports(prev => prev.filter(r => r.id !== id))
  }, [])

  return (
    <PendingReportContext.Provider
      value={{ pendingReports, addPendingReport, updateReportStatus, removePendingReport }}>
      {children}
    </PendingReportContext.Provider>
  )
}

export const usePendingReports = () => useContext(PendingReportContext)
