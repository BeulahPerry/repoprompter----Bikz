import React, { useState } from 'react'
import { useRepoContext } from '../hooks/useRepoContext'
import { FileList } from './FileList'
import { PromptModal } from './PromptModal'
import { Button } from './ui/Button'
import { Card, CardHeader, CardBody } from './ui/Card'

export function DirectorySelector() {
  const {
    baseDir,
    setBaseDir,
    setFileList,
    createGroupFromSelection,
    groups,
    selectGroup,
    toggleGroup,
    removeGroup,
    activeGroupName,
    unselectUnnecessaryFiles,
    isPromptModalOpen,
    closePromptModal,
    modalDefaultValue,
    handlePromptConfirm,
    modalButtonRef
  } = useRepoContext()
  
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false)

  const handleSelectDirectory = async () => {
    try {
      const selectedPath = await window.api.selectDirectory()
      if (selectedPath) {
        setBaseDir(selectedPath)
        const files = await window.api.readDirectory(selectedPath)
        setFileList(files)
      }
    } catch (error) {
      console.error('Error selecting directory:', error)
    }
  }

  const handleRefreshDirectory = async () => {
    if (!baseDir) return
    try {
      const files = await window.api.readDirectory(baseDir)
      setFileList(files) // This will clear token cache via setFileList
    } catch (error) {
      console.error('Error refreshing directory:', error)
    }
  }

  // unified header uses direct event target for anchoring the Save Group modal
  const [tokenBudget, setTokenBudget] = React.useState<number>(200_000)
  const [sortMode, setSortMode] = React.useState<'path' | 'tokensDesc' | 'tokensAsc' | 'recent'>('path')
  const [minTokens, setMinTokens] = React.useState<number>(0)
  const [maxTokens, setMaxTokens] = React.useState<number | undefined>(undefined)
  const [textFilter, setTextFilter] = React.useState<string>('')
  const [hideBinary, setHideBinary] = React.useState<boolean>(true)
  const [hideLocks, setHideLocks] = React.useState<boolean>(true)
  const [hideArtifacts, setHideArtifacts] = React.useState<boolean>(true)

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Unified Repository + Files */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="text-sm font-semibold truncate">
              {baseDir ? baseDir.split('/').pop() : 'Repository'}
            </h3>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto no-scrollbar">
            <Button onClick={handleSelectDirectory} variant={baseDir ? 'ghost' : 'primary'} size="sm" className="shrink-0">
              Open Repo
            </Button>
            <Button onClick={handleRefreshDirectory} variant="secondary" size="sm" disabled={!baseDir} className="shrink-0">
              Refresh
            </Button>
            <Button
              onClick={(e) => createGroupFromSelection(e.currentTarget as unknown as HTMLElement)}
              variant="secondary"
              size="sm"
              className="shrink-0"
            >
              Save Group
            </Button>
            <Button
              onClick={unselectUnnecessaryFiles}
              variant="ghost"
              size="sm"
              className="shrink-0"
              disabled={!baseDir}
            >
              Clean Selection
            </Button>
            {/* Expand/Collapse helpers */}
            <Button
              onClick={() => setIsTreeCollapsed(false)}
              variant="ghost"
              size="sm"
              aria-label="Expand all folders"
              title="Expand all"
              disabled={!baseDir}
              className="shrink-0 px-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
            <Button
              onClick={() => setIsTreeCollapsed(true)}
              variant="ghost"
              size="sm"
              aria-label="Collapse all folders"
              title="Collapse all"
              disabled={!baseDir}
              className="shrink-0 px-2"
            >
              <svg className="w-4 h-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-2 overflow-auto h-[70vh]">
          {baseDir ? (
            <>
              {/* Toolbar: budget, sort, filters */}
              <div className="flex items-center gap-2 px-2 pb-2 border-b border-muted/30">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-tertiary">Budget</span>
                  <input
                    type="number"
                    className="bg-elev-2 border border-muted/40 rounded px-2 py-1 text-xs w-28"
                    value={tokenBudget}
                    min={10000}
                    step={1000}
                    onChange={(e) => setTokenBudget(Number(e.target.value || 0))}
                    title="Token budget"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-tertiary">Sort</span>
                  <select
                    className="bg-elev-2 border border-muted/40 rounded px-2 py-1 text-xs"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as any)}
                  >
                    <option value="path">Path</option>
                    <option value="tokensDesc">Tokens (desc)</option>
                    <option value="tokensAsc">Tokens (asc)</option>
                    <option value="recent">Recently Modified</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-tertiary">Min</span>
                  <input
                    type="number"
                    className="bg-elev-2 border border-muted/40 rounded px-2 py-1 text-xs w-20"
                    value={minTokens}
                    min={0}
                    step={100}
                    onChange={(e) => setMinTokens(Number(e.target.value || 0))}
                    title="Only show files with tokens >= Min"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-tertiary">Max</span>
                  <input
                    type="number"
                    className="bg-elev-2 border border-muted/40 rounded px-2 py-1 text-xs w-20"
                    value={maxTokens ?? ''}
                    min={0}
                    step={100}
                    onChange={(e) => {
                      const v = e.target.value
                      setMaxTokens(v === '' ? undefined : Number(v))
                    }}
                    title="Hide files with tokens > Max"
                  />
                </div>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-xs text-tertiary">Filter</span>
                  <input
                    type="text"
                    className="bg-elev-2 border border-muted/40 rounded px-2 py-1 text-xs w-full"
                    placeholder="path contains..."
                    value={textFilter}
                    onChange={(e) => setTextFilter(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                  <input type="checkbox" checked={hideBinary} onChange={(e) => setHideBinary(e.target.checked)} />
                  Hide binary
                </label>
                <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                  <input type="checkbox" checked={hideLocks} onChange={(e) => setHideLocks(e.target.checked)} />
                  Hide locks
                </label>
                <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                  <input type="checkbox" checked={hideArtifacts} onChange={(e) => setHideArtifacts(e.target.checked)} />
                  Hide artifacts
                </label>
              </div>
              <FileList
                isTreeCollapsed={isTreeCollapsed}
                tokenBudget={tokenBudget}
                sortMode={sortMode}
                filters={{ minTokens, maxTokens, text: textFilter, hideBinary, hideLocks, hideArtifacts }}
              />
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-tertiary">
              No repository selected
            </div>
          )}
        </CardBody>
      </Card>

      {/* File Groups */}
      {groups.length > 0 && (
        <Card className="flex-shrink-0">
          <CardBody className="p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">File Groups</h3>
            <div className="space-y-1">
              {groups.map((group) => (
                <div
                  key={group.name}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1
                    ${activeGroupName === group.name 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-secondary'
                    }`}
                  onClick={() => selectGroup(group.name)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={activeGroupName === group.name}
                  aria-label={`${activeGroupName === group.name ? 'Active' : 'Select'} file group ${group.name} with ${group.files.length} files`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      selectGroup(group.name)
                    }
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleGroup(group.name)
                    }}
                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
                    aria-label={`${activeGroupName === group.name ? 'Collapse' : 'Expand'} group ${group.name}`}
                    aria-expanded={activeGroupName === group.name}
                  >
                    <svg 
                      className={`w-3 h-3 transition-transform ${
                        activeGroupName === group.name ? 'rotate-90' : ''
                      }`} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="flex-1 text-sm font-medium truncate">{group.name}</span>
                  <span className="text-xs bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full">
                    {group.files.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeGroup(group.name)
                    }}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-0.5 rounded hover:bg-danger/10 text-danger transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-1"
                    aria-label={`Delete group ${group.name}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* File Groups remain separate below */}

      {/* Prompt Modal */}
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={closePromptModal}
        onConfirm={handlePromptConfirm}
        title="Save Group"
        defaultValue={modalDefaultValue}
        anchorElement={modalButtonRef}
      />
    </div>
  )
}