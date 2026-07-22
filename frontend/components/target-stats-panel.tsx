'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { extractTargetStats } from '@/app/stats/hooks/recordHandler';
import BarChart from '@/components/ui/bar-chart';

interface TargetStats {
  target: string;
  totalGames: number;
  bValueFrequency: Record<number, number>;
  bValueSuccessRate: Record<number, number>;
  overallSuccessRate: number;
}

const TargetStatsPanel = () => {
  const [targetStats, setTargetStats] = useState<TargetStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTargetStats = async () => {
    try {
      const stats = await extractTargetStats();
      setTargetStats(stats);
    } catch (error) {
      console.error('Error loading target stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTargetStats();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">載入目標統計資料中...</p>
      </div>
    );
  }

  const getTargetColor = (target: string) => {
    switch (target) {
      case 'A': return '#9F2042';
      case 'B': return '#BA264E';
      case 'C': return '#cb2a55';
      case 'D': return '#d5345f';
    }
  };

  const getTargetName = (target: string) => {
    switch (target) {
      case 'A': return '位置 A';
      case 'B': return '位置 B';
      case 'C': return '位置 C';
      case 'D': return '位置 D';
      default: return `位置 ${target}`;
    }
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-gray-800">目標詳細統計</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="A" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {targetStats.map((stat) => (
              <TabsTrigger
                key={stat.target}
                value={stat.target}
                className="flex items-center gap-2"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getTargetColor(stat.target) }}
                ></div>
                {stat.target}
              </TabsTrigger>
            ))}
          </TabsList>

          {targetStats.map((stat) => (
            <TabsContent key={stat.target} value={stat.target} className="space-y-6">
              {/* Target Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{stat.totalGames}</div>
                      <p className="text-sm text-gray-600">總遊戲次數</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-black">
                        {stat.overallSuccessRate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-600">整體命中率</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: getTargetColor(stat.target) }}>
                        {getTargetName(stat.target)}
                      </div>
                      <p className="text-sm text-gray-600">目標位置</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* B-Value Frequency Chart */}
                <Card>
                  <CardContent className="pt-6">
                    <BarChart
                      data={Array.from({ length: 7 }, (_, i) => {
                        const bValue = 7 - i;
                        return {
                          label: `B=${i - 3}`,
                          value: stat.bValueFrequency[bValue] || 0,
                          color: '#3B82F6'
                        };
                      })}
                      title="各 B 值頻率分布"
                      description=""
                      height={250}
                    />
                  </CardContent>
                </Card>

                {/* B-Value Success Rate Chart */}
                <Card>
                  <CardContent className="pt-6">
                    <BarChart
                      data={Array.from({ length: 7 }, (_, i) => {
                        const bValue = 7 - i;
                        const successRate = stat.bValueSuccessRate[bValue] || 0;
                        return {
                          label: `B=${i - 3}`,
                          value: Math.round(successRate),
                          color: successRate > 50 ? '#43A047' : successRate > 25 ? '#F59E0B' : '#EF4444'
                        };
                      })}
                      title="各 B 值命中率 (%)"
                      description=""
                      height={250}
                      maxValue={100}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Detailed B-Value Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">詳細數據表</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-4">B 值</th>
                          <th className="text-center py-2 px-4">遊戲次數</th>
                          <th className="text-center py-2 px-4">命中次數</th>
                          <th className="text-center py-2 px-4">命中率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 7 }, (_, i) => {
                          const bValue = 7 - i;
                          const frequency = stat.bValueFrequency[bValue] || 0;
                          const successRate = stat.bValueSuccessRate[bValue] || 0;
                          const hits = Math.round((frequency * successRate) / 100);

                          return (
                            <tr key={bValue} className="border-b border-gray-100">
                              <td className="py-2 px-4 font-medium">B={bValue}</td>
                              <td className="py-2 px-4 text-center">{frequency}</td>
                              <td className="py-2 px-4 text-center">{hits}</td>
                              <td className="py-2 px-4 text-center">
                                <span
                                  className={`font-medium ${successRate > 50 ? 'text-green-600' :
                                    successRate > 25 ? 'text-yellow-600' : 'text-red-600'
                                    }`}
                                >
                                  {successRate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TargetStatsPanel; 