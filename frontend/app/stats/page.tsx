'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { recordExtractor, clearRecords } from './hooks/recordHandler';
import BarChart from '@/components/ui/bar-chart';
import TargetStatsPanel from '@/components/target-stats-panel';

const StatsPage = () => {
  const [stats, setStats] = useState({
    totalRows: 0,
    uniqueBValues: 0,
    uniqueTargets: 0,
    uniqueResults: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    bValueCounts: {} as Record<number, number>,
    targetCounts: {} as Record<string, number>,
    resultCounts: {} as Record<string, number>
  });

  const [isLoading, setIsLoading] = useState(true);
  const [targetStatsKey, setTargetStatsKey] = useState(0); // Key to force TargetStatsPanel refresh

  const loadStats = async () => {
    try {
      const data = await recordExtractor();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearRecords = async () => {
    if (window.confirm('確定要清除所有遊戲記錄嗎？此操作無法復原。')) {
      await clearRecords();
      await loadStats();
      setTargetStatsKey(prev => prev + 1); // Force TargetStatsPanel to refresh
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入統計資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">統計資訊</h1>
          <Button
            onClick={async () => {
              await loadStats();
              setTargetStatsKey(prev => prev + 1); // Force TargetStatsPanel to refresh
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            重新整理統計
          </Button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Games */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-700">總遊戲次數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">{stats.totalRows}</div>
              <p className="text-sm text-gray-500 mt-1">場遊戲</p>
            </CardContent>
          </Card>

          {/* Hit Rate */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-700">命中率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">
                {stats.hitRate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {stats.hitCount} 命中 / {stats.missCount} 未中
              </p>
            </CardContent>
          </Card>

          {/* Hit Count */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-700">命中次數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.hitCount}</div>
              <p className="text-sm text-gray-500 mt-1">次成功命中</p>
            </CardContent>
          </Card>

          {/* Miss Count */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-700">未中次數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.missCount}</div>
              <p className="text-sm text-gray-500 mt-1">次未命中</p>
            </CardContent>
          </Card>
        </div>

        {/* Bar Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* B Value Bar Chart */}
          <Card className="bg-white shadow-lg">
            <CardContent className="pt-6">
              <BarChart
                data={Array.from({ length: 7 }, (_, i) => {
                  const bValue = 7 - i;
                  return {
                    label: `B=${i - 3}`,
                    value: stats.bValueCounts[bValue] || 0,
                    color: '#3B82F6'
                  };
                })}
                title="B 值頻率分布"
                description="每個 B 值的遊戲次數分布"
                height={250}
              />
            </CardContent>
          </Card>

          {/* Target Bar Chart */}
          <Card className="bg-white shadow-lg">
            <CardContent className="pt-6">
              <BarChart
                data={Object.entries(stats.targetCounts).map(([target, count]) => ({
                  label: `位置 ${target}`,
                  value: count,
                  color: target === 'A' ? '#9f2042' : target === 'B' ? '#BA264E' : target === 'C' ? '#cb2a55' : '#d5345f'
                }))}
                title="目標位置統計"
                description="每個目標位置的遊戲次數分布"
                height={250}
              />
            </CardContent>
          </Card>
        </div>

        {/* Target Stats Panel */}
        <div className="mb-8">
          <TargetStatsPanel key={targetStatsKey} />
        </div>

        {/* Action Buttons */}
        <div className="text-center space-x-4">
          <Button
            onClick={async () => {
              try {
                // Get records from API first, fallback to localStorage
                let records = [];
                try {
                  const response = await fetch('/api/records');
                  if (response.ok) {
                    const data = await response.json();
                    records = data.records || [];
                  }
                } catch {
                  console.warn('Failed to get records from API, using localStorage');
                }

                // If no API records, use localStorage
                if (records.length === 0) {
                  const existingRecordsJson = localStorage.getItem('game_records');
                  records = existingRecordsJson ? JSON.parse(existingRecordsJson) : [];
                }

                if (records.length === 0) {
                  alert('沒有可下載的遊戲記錄');
                  return;
                }

                // Create and download the file
                const dataStr = JSON.stringify(records, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `game_records_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error downloading records:', error);
                alert('下載失敗，請稍後再試');
              }
            }}
            disabled={stats.totalRows === 0}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下載紀錄
          </Button>
          <Button
            onClick={handleClearRecords}
            variant="outline"
            className="border-red-300 hover:text-red-500 text-red-400 hover:bg-red-50 px-6 py-2 rounded-lg"
          >
            清除所有記錄
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;