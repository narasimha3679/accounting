import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Settings,
    TestTube,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Building2,
    DollarSign,
} from 'lucide-react'

const Integration: React.FC = () => {
    const [config, setConfig] = useState({
        personal_finance_api_url: '',
        personal_finance_api_key: '',
        is_enabled: true,
    })
    const queryClient = useQueryClient()

    // Mock API calls - replace with actual API calls
    const { data: integrationStatus, isLoading } = useQuery({
        queryKey: ['integration-status'],
        queryFn: async () => {
            // Mock data - replace with actual API call
            return {
                personal_finance_configured: true,
                integration_enabled: true,
                total_dividends: 8,
                last_sync: '2024-01-15 14:30:00',
                personal_finance_api_url: 'http://localhost:3001/api/v1',
            }
        },
    })

    useQuery({
        queryKey: ['personal-finance-config'],
        queryFn: async () => {
            // Mock data - replace with actual API call
            return {
                personal_finance_api_url: 'http://localhost:3001/api/v1',
                personal_finance_api_key: '***hidden***',
                is_enabled: true,
            }
        },
    })

    const testConnectionMutation = useMutation({
        mutationFn: async () => {
            // Mock API call - replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 2000))
            return { status: 'success', message: 'Successfully connected to personal finance system' }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integration-status'] })
        },
    })

    const saveConfigMutation = useMutation({
        mutationFn: async () => {
            // Mock API call - replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 1500))
            return { message: 'Configuration saved successfully' }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personal-finance-config'] })
            queryClient.invalidateQueries({ queryKey: ['integration-status'] })
        },
    })

    const syncDividendsMutation = useMutation({
        mutationFn: async () => {
            // Mock API call - replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 2000))
            return {
                message: 'Dividend sync completed',
                success_count: 8,
                error_count: 0,
                errors: []
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integration-status'] })
        },
    })

    const handleSaveConfig = () => {
        saveConfigMutation.mutate()
    }

    const handleTestConnection = () => {
        testConnectionMutation.mutate()
    }

    const handleSyncDividends = () => {
        syncDividendsMutation.mutate()
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Personal Finance Integration</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Connect your corporate accounting system with your personal finance management
                </p>
            </div>

            {/* Integration Status */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Integration Status</h3>
                    <button
                        onClick={handleTestConnection}
                        disabled={testConnectionMutation.isPending}
                        className="btn btn-secondary"
                    >
                        {testConnectionMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                        {integrationStatus?.personal_finance_configured ? (
                            <CheckCircle className="h-6 w-6 text-success-600" />
                        ) : (
                            <XCircle className="h-6 w-6 text-danger-600" />
                        )}
                        <div>
                            <p className="text-sm font-medium text-gray-900">Configuration</p>
                            <p className="text-sm text-gray-500">
                                {integrationStatus?.personal_finance_configured ? 'Configured' : 'Not Configured'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {integrationStatus?.integration_enabled ? (
                            <CheckCircle className="h-6 w-6 text-success-600" />
                        ) : (
                            <XCircle className="h-6 w-6 text-danger-600" />
                        )}
                        <div>
                            <p className="text-sm font-medium text-gray-900">Integration Status</p>
                            <p className="text-sm text-gray-500">
                                {integrationStatus?.integration_enabled ? 'Enabled' : 'Disabled'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Building2 className="h-6 w-6 text-primary-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-900">Personal Finance API</p>
                            <p className="text-sm text-gray-500">{integrationStatus?.personal_finance_api_url || 'Not set'}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <AlertCircle className="h-6 w-6 text-warning-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-900">Last Sync</p>
                            <p className="text-sm text-gray-500">{integrationStatus?.last_sync || 'Never'}</p>
                        </div>
                    </div>
                </div>

                {testConnectionMutation.isSuccess && (
                    <div className="mt-4 p-3 bg-success-50 border border-success-200 rounded-lg">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
                            <p className="text-sm text-success-700">{testConnectionMutation.data?.message}</p>
                        </div>
                    </div>
                )}

                {testConnectionMutation.isError && (
                    <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                        <div className="flex items-center">
                            <XCircle className="h-5 w-5 text-danger-600 mr-2" />
                            <p className="text-sm text-danger-700">Failed to connect to personal finance system</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Configuration */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
                    <p className="text-sm text-gray-500">
                        Configure the connection to your personal finance system
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Personal Finance API URL
                        </label>
                        <input
                            type="url"
                            value={config.personal_finance_api_url}
                            onChange={(e) => setConfig({ ...config, personal_finance_api_url: e.target.value })}
                            className="input"
                            placeholder="http://localhost:3001/api/v1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            URL of your personal finance system API
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Key
                        </label>
                        <input
                            type="password"
                            value={config.personal_finance_api_key}
                            onChange={(e) => setConfig({ ...config, personal_finance_api_key: e.target.value })}
                            className="input"
                            placeholder="Enter your personal finance API key"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            API key for authenticating with your personal finance system
                        </p>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="enabled"
                            checked={config.is_enabled}
                            onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                            Enable automatic dividend sync
                        </label>
                    </div>

                    <button
                        onClick={handleSaveConfig}
                        disabled={saveConfigMutation.isPending}
                        className="btn btn-primary"
                    >
                        {saveConfigMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                            <Settings className="h-4 w-4 mr-2" />
                        )}
                        Save Configuration
                    </button>

                    {saveConfigMutation.isSuccess && (
                        <div className="p-3 bg-success-50 border border-success-200 rounded-lg">
                            <div className="flex items-center">
                                <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
                                <p className="text-sm text-success-700">{saveConfigMutation.data?.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dividend Sync */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">Dividend Sync</h3>
                    <p className="text-sm text-gray-500">
                        Manually sync dividend data to your personal finance system
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <DollarSign className="h-8 w-8 text-primary-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-900">Total Dividends</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {integrationStatus?.total_dividends || 0}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSyncDividends}
                        disabled={syncDividendsMutation.isPending}
                        className="btn btn-primary"
                    >
                        {syncDividendsMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        Sync All Dividends
                    </button>
                </div>

                {syncDividendsMutation.isSuccess && (
                    <div className="mt-4 p-3 bg-success-50 border border-success-200 rounded-lg">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
                            <div>
                                <p className="text-sm text-success-700">{syncDividendsMutation.data?.message}</p>
                                <p className="text-xs text-success-600">
                                    {syncDividendsMutation.data?.success_count} successful, {syncDividendsMutation.data?.error_count} errors
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* How It Works */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">How It Works</h3>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary-600">1</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">Automatic Sync</h4>
                            <p className="text-sm text-gray-500">
                                When you create or update dividends in the corporate system, they are automatically sent to your personal finance system.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary-600">2</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">Real-time Updates</h4>
                            <p className="text-sm text-gray-500">
                                Your personal finance dashboard will show dividend income as soon as it's declared or paid in the corporate system.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary-600">3</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">Tax Integration</h4>
                            <p className="text-sm text-gray-500">
                                Dividend data flows into your personal tax calculations, ensuring accurate tax return preparation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Integration
