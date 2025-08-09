<template>
  <section
    data-test="study-stats"
    role="region"
    :aria-label="`Study Statistics for ${examId}`"
    :class="[
      'study-stats p-6 bg-white rounded-lg shadow-lg',
      {
        'mobile-layout': isMobile
      }
    ]"
  >
    <!-- Loading State -->
    <div
      v-if="isLoading"
      data-test="loading-state"
      class="flex items-center justify-center py-12"
    >
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-lg text-gray-600">Loading detailed analytics...</p>
        <p class="text-sm text-gray-500 mt-2">Analyzing your performance data</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      data-test="error-state"
      class="text-center py-12"
    >
      <div class="text-red-500 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Analytics Error</h3>
      <p data-test="error-message" class="text-gray-600 mb-4">{{ error }}</p>
      <button
        data-test="retry-analytics"
        @click="fetchAnalyticsData"
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Retry
      </button>
    </div>

    <!-- No Data State -->
    <div
      v-else-if="!sessionHistory.length"
      data-test="no-stats-data"
      class="text-center py-12"
    >
      <div class="text-gray-400 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No Statistics Available</h3>
      <p class="text-gray-600">Complete a few study sessions to see detailed analytics</p>
    </div>

    <!-- Main Analytics Content -->
    <div v-else class="analytics-content">
      <!-- Header with Controls -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Study Performance Analytics</h2>
          <p class="text-gray-600">Comprehensive analysis of your learning progress</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0">
          <!-- Time Range Selector -->
          <select
            v-model="selectedTimeRange"
            data-test="time-range-selector"
            @change="updateTimeRange(selectedTimeRange)"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option data-test="time-range-option" value="last7days">Last 7 days</option>
            <option data-test="time-range-option" value="last30days">Last 30 days</option>
            <option data-test="time-range-option" value="last3months">Last 3 months</option>
            <option data-test="time-range-option" value="last6months">Last 6 months</option>
            <option data-test="time-range-option" value="lastyear">Last year</option>
            <option data-test="time-range-option" value="all">All time</option>
          </select>

          <!-- Export Options -->
          <div class="relative">
            <button
              data-test="export-detailed-stats"
              @click="showExportOptions = !showExportOptions"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>

            <!-- Export Dropdown -->
            <div
              v-if="showExportOptions"
              data-test="export-format-selection"
              class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
            >
              <div class="py-1">
                <button
                  @click="exportDetailedStats('json')"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  JSON Data
                </button>
                <button
                  @click="exportDetailedStats('csv')"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  CSV Report
                </button>
                <button
                  data-test="pdf-export"
                  @click="exportToPDF()"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  PDF Report
                </button>
                <button
                  data-test="custom-date-export"
                  @click="showCustomDateExport = true"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Custom Date Range
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtered Data Summary -->
      <div
        v-if="selectedTimeRange !== 'all'"
        data-test="filtered-data-summary"
        class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
      >
        <p class="text-blue-800">
          Showing analytics for {{ formatTimeRange(selectedTimeRange) }} 
          ({{ filteredSessionHistory.length }} sessions)
        </p>
      </div>

      <!-- View Tabs -->
      <div class="mb-8">
        <nav data-test="view-selector" class="flex space-x-8 border-b border-gray-200">
          <button
            data-test="overview-tab"
            @click="selectedView = 'overview'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              selectedView === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Overview
          </button>
          <button
            data-test="detailed-tab"
            @click="selectedView = 'detailed'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              selectedView === 'detailed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Detailed Analysis
          </button>
          <button
            data-test="comparison-tab"
            @click="selectedView = 'comparison'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              selectedView === 'comparison'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Comparison
          </button>
          <button
            data-test="trends-tab"
            @click="selectedView = 'trends'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              selectedView === 'trends'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Trends
          </button>
        </nav>
      </div>

      <!-- Overview Tab Content -->
      <div v-if="selectedView === 'overview'" class="overview-content">
        <!-- Key Performance Indicators -->
        <div
          data-test="stats-container"
          :class="[
            'grid gap-6 mb-8',
            isMobile ? 'grid-cols-1 mobile-stack' : 'grid-cols-2 lg:grid-cols-4'
          ]"
        >
          <!-- Average Session Score -->
          <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-blue-800">Average Score</p>
                <p data-test="average-session-score" class="text-3xl font-bold text-blue-900">
                  {{ Math.round(calculateAverageScore()) }}%
                </p>
              </div>
              <div class="p-3 bg-blue-200 rounded-full">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Total Questions Attempted -->
          <div class="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-green-800">Questions Answered</p>
                <p data-test="total-questions-attempted" class="text-3xl font-bold text-green-900">
                  {{ calculateTotalQuestions() }}
                </p>
              </div>
              <div class="p-3 bg-green-200 rounded-full">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Overall Accuracy Rate -->
          <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-purple-800">Overall Accuracy</p>
                <p data-test="overall-accuracy-rate" class="text-3xl font-bold text-purple-900">
                  {{ Math.round(calculateOverallAccuracy()) }}%
                </p>
              </div>
              <div class="p-3 bg-purple-200 rounded-full">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Study Time -->
          <div class="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-orange-800">Total Study Time</p>
                <p class="text-3xl font-bold text-orange-900">
                  {{ formatTime(calculateTotalStudyTime()) }}
                </p>
              </div>
              <div class="p-3 bg-orange-200 rounded-full">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Improvement Trend Indicator -->
        <div
          data-test="improvement-trend"
          :class="[
            'flex items-center justify-center p-4 rounded-lg mb-8',
            performanceMetrics.improvementTrend > 0 
              ? 'bg-green-50 border border-green-200 positive-trend'
              : performanceMetrics.improvementTrend < 0
              ? 'bg-red-50 border border-red-200 negative-trend'
              : 'bg-gray-50 border border-gray-200'
          ]"
        >
          <svg 
            v-if="performanceMetrics.improvementTrend > 0"
            class="w-5 h-5 text-green-600 mr-2"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <svg 
            v-else-if="performanceMetrics.improvementTrend < 0"
            class="w-5 h-5 text-red-600 mr-2"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
          <span :class="[
            'font-medium',
            performanceMetrics.improvementTrend > 0 ? 'text-green-800' : 
            performanceMetrics.improvementTrend < 0 ? 'text-red-800' : 'text-gray-800'
          ]">
            {{ formatTrendMessage() }}
          </span>
        </div>

        <!-- Performance Trends Chart -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Performance Over Time</h3>
          <div 
            data-test="performance-trend-chart"
            :class="[
              'bg-white border border-gray-200 rounded-lg p-4 h-80',
              isMobile && 'mobile-chart'
            ]"
          >
            <canvas ref="performanceTrendChart"></canvas>
          </div>
        </div>

        <!-- Topic Performance Quick Overview -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Topic Performance Summary</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Best Performing Topics -->
            <div data-test="best-topic" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 class="font-medium text-green-900 mb-2">Strong Areas</h4>
              <ul class="space-y-1">
                <li 
                  v-for="area in performanceMetrics.strongAreas" 
                  :key="area"
                  class="text-sm text-green-700"
                >
                  {{ area }}
                </li>
              </ul>
            </div>

            <!-- Areas for Improvement -->
            <div data-test="worst-topic" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 class="font-medium text-red-900 mb-2">Areas to Focus On</h4>
              <ul class="space-y-1">
                <li 
                  v-for="area in performanceMetrics.weakAreas" 
                  :key="area"
                  class="text-sm text-red-700"
                >
                  {{ area }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Analysis Tab Content -->
      <div v-else-if="selectedView === 'detailed'" class="detailed-content">
        <!-- Topic Analysis -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Topic-wise Performance Analysis</h3>
          
          <!-- Topic Accuracy Chart -->
          <div data-test="topic-accuracy-chart" class="bg-white border border-gray-200 rounded-lg p-4 h-80 mb-6">
            <canvas ref="topicAccuracyChart"></canvas>
          </div>

          <!-- Topic Breakdown Table -->
          <div data-test="topic-breakdown-table" class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr 
                  v-for="(data, topic) in questionAnalytics" 
                  :key="topic"
                  :data-test="`topic-${topic.replace(/\s+/g, '-').toLowerCase()}`"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ topic }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ data.correctAnswers }}/{{ data.totalQuestions }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ data.accuracy }}%</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ data.averageTime }}s</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="[
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      data.accuracy >= 80 
                        ? 'bg-green-100 text-green-800'
                        : data.accuracy >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    ]">
                      {{ data.accuracy >= 80 ? 'Strong' : data.accuracy >= 60 ? 'Average' : 'Needs Work' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Difficulty Analysis -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Difficulty Level Analysis</h3>
          
          <!-- Difficulty Chart -->
          <div data-test="difficulty-breakdown-chart" class="bg-white border border-gray-200 rounded-lg p-4 h-80 mb-6">
            <canvas ref="difficultyChart"></canvas>
          </div>

          <!-- Difficulty Statistics -->
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div 
              v-for="level in [1, 2, 3, 4, 5]" 
              :key="level"
              :data-test="`difficulty-${level}`"
              class="bg-white border border-gray-200 rounded-lg p-4 text-center"
            >
              <div class="text-2xl font-bold text-gray-900">{{ getDifficultyAccuracy(level) }}%</div>
              <div class="text-sm text-gray-500">Level {{ level }}</div>
              <div class="text-xs text-gray-400">{{ getDifficultyQuestionCount(level) }} questions</div>
            </div>
          </div>

          <!-- Difficulty Insights -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-test="difficulty-strengths" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 class="font-medium text-green-900 mb-2">Difficulty Strengths</h4>
              <ul class="space-y-1">
                <li v-for="strength in getDifficultyStrengths()" :key="strength" class="text-sm text-green-700">
                  Level {{ strength.level }}: {{ strength.accuracy }}% accuracy
                </li>
              </ul>
            </div>

            <div data-test="difficulty-weaknesses" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 class="font-medium text-red-900 mb-2">Areas for Improvement</h4>
              <ul class="space-y-1">
                <li v-for="weakness in getDifficultyWeaknesses()" :key="weakness" class="text-sm text-red-700">
                  Level {{ weakness.level }}: {{ weakness.accuracy }}% accuracy
                </li>
              </ul>
            </div>
          </div>

          <!-- Difficulty Recommendation -->
          <div data-test="difficulty-recommendation" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 class="font-medium text-blue-900 mb-2">Recommendation</h4>
            <p class="text-sm text-blue-700">{{ getDifficultyRecommendation() }}</p>
          </div>
        </div>

        <!-- Time Analysis Section -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Time Analysis</h3>
          
          <!-- Time Statistics -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <h4 data-test="average-time-per-question" class="font-medium text-gray-900 mb-2">Average Time per Question</h4>
              <div class="text-2xl font-bold text-blue-600">{{ Math.round(calculateAverageTimePerQuestion()) }}s</div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">Fastest Question</h4>
              <div class="text-2xl font-bold text-green-600">{{ calculateFastestQuestionTime() }}s</div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">Slowest Question</h4>
              <div class="text-2xl font-bold text-red-600">{{ calculateSlowestQuestionTime() }}s</div>
            </div>
          </div>

          <!-- Time Distribution Chart -->
          <div data-test="time-distribution-chart" class="bg-white border border-gray-200 rounded-lg p-4 h-80 mb-6">
            <canvas ref="timeDistributionChart"></canvas>
          </div>

          <!-- Time Patterns and Efficiency -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-test="time-patterns" class="bg-white border border-gray-200 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">Time Patterns</h4>
              <ul class="space-y-2 text-sm text-gray-700">
                <li>• Questions per hour: {{ Math.round(calculateQuestionsPerHour()) }}</li>
                <li>• Most efficient time range: {{ getMostEfficientTimeRange() }}</li>
                <li>• Time consistency: {{ getTimeConsistency() }}</li>
              </ul>
            </div>

            <div data-test="time-efficiency-recommendations" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 class="font-medium text-blue-900 mb-2">Efficiency Recommendations</h4>
              <ul class="space-y-2 text-sm text-blue-700">
                <li v-for="rec in getTimeEfficiencyRecommendations()" :key="rec">• {{ rec }}</li>
              </ul>
            </div>
          </div>

          <!-- Session Duration Trends -->
          <div data-test="session-duration-trends" class="bg-white border border-gray-200 rounded-lg p-4 h-64 mt-6">
            <canvas ref="sessionDurationChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Comparison Tab Content -->
      <div v-else-if="selectedView === 'comparison'" class="comparison-content">
        <!-- User vs Average Comparison -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Performance vs Community Average</h3>
          
          <!-- Comparison Chart -->
          <div data-test="comparison-chart" class="bg-white border border-gray-200 rounded-lg p-4 h-80 mb-6">
            <canvas ref="comparisonChart"></canvas>
          </div>

          <!-- Performance Comparison Grid -->
          <div data-test="performance-comparison" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 class="font-medium text-gray-900 mb-2">Your Average Score</h4>
              <div class="text-3xl font-bold text-blue-600">{{ Math.round(calculateAverageScore()) }}%</div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 class="font-medium text-gray-900 mb-2">Community Average</h4>
              <div class="text-3xl font-bold text-gray-600">{{ averageScores.overall }}%</div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 class="font-medium text-gray-900 mb-2">Your Percentile</h4>
              <div class="text-3xl font-bold text-green-600">{{ calculatePercentileRanking() }}th</div>
            </div>
          </div>

          <!-- Competitive Advantages -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-test="competitive-advantages" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 class="font-medium text-green-900 mb-2">Your Competitive Advantages</h4>
              <ul class="space-y-1">
                <li v-for="advantage in getCompetitiveAdvantages()" :key="advantage" class="text-sm text-green-700">
                  {{ advantage }}
                </li>
              </ul>
            </div>

            <div data-test="improvement-opportunities" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 class="font-medium text-blue-900 mb-2">Improvement Opportunities</h4>
              <ul class="space-y-1">
                <li v-for="opportunity in getImprovementOpportunities()" :key="opportunity" class="text-sm text-blue-700">
                  {{ opportunity }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Trends Tab Content -->
      <div v-else-if="selectedView === 'trends'" class="trends-content">
        <!-- Learning Velocity -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Learning Velocity Metrics</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 class="font-medium text-gray-900 mb-2">Mastery Rate</h4>
              <div class="text-2xl font-bold text-blue-600">{{ calculateMasteryRate() }}</div>
              <div class="text-xs text-gray-500">questions/day</div>
            </div>
            
            <div data-test="retention-rate" class="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 class="font-medium text-gray-900 mb-2">Retention Rate</h4>
              <div class="text-2xl font-bold text-green-600">{{ calculateRetentionRate() }}%</div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 class="font-medium text-gray-900 mb-2">Learning Velocity</h4>
              <div class="text-2xl font-bold text-purple-600">{{ calculateLearningVelocity() }}</div>
            </div>
            
            <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 class="font-medium text-gray-900 mb-2">Time to Proficiency</h4>
              <div class="text-2xl font-bold text-orange-600">{{ estimateTimeToProficiency() }}</div>
              <div class="text-xs text-gray-500">days</div>
            </div>
          </div>

          <!-- Learning Curve Chart -->
          <div data-test="learning-curve" class="bg-white border border-gray-200 rounded-lg p-4 h-80 mb-6">
            <canvas ref="learningCurveChart"></canvas>
          </div>

          <!-- Velocity Benchmarks -->
          <div data-test="velocity-benchmarks" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2">Velocity Benchmarks</h4>
            <div class="text-sm text-gray-700">
              {{ getVelocityBenchmarkMessage() }}
            </div>
          </div>
        </div>

        <!-- Trend Analysis Summary -->
        <div data-test="trend-analysis-summary" class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Trend Analysis Summary</h3>
          
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <div class="prose prose-sm">
              <p class="text-gray-700">{{ getTrendAnalysisSummary() }}</p>
            </div>
          </div>
        </div>

        <!-- Performance Plateaus and Regression Analysis -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2">Performance Plateaus</h4>
            <ul class="space-y-2 text-sm text-gray-700">
              <li v-for="plateau in identifyPerformancePlateaus()" :key="plateau.period">
                {{ plateau.period }}: {{ plateau.description }}
              </li>
            </ul>
          </div>

          <div data-test="regression-analysis" class="bg-white border border-gray-200 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2">Regression Analysis</h4>
            <div class="text-sm text-gray-700">
              <p>Correlation between time and performance: {{ calculateTimeScoreCorrelation().toFixed(3) }}</p>
              <p>Standard deviation: {{ calculateScoreStandardDeviation().toFixed(1) }}%</p>
              <p>Confidence interval: {{ formatConfidenceInterval() }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Region for Screen Reader Announcements -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ screenReaderMessage }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useStudyStore } from '~/stores/study';
import { useExamStore } from '~/stores/exam';
import { Chart, registerables } from 'chart.js';
import type { StudySession } from '~/types/exam';

Chart.register(...registerables);

// Props
interface Props {
  examId: string;
  userId: string;
}

const props = defineProps<Props>();

// Stores
const studyStore = useStudyStore();
const examStore = useExamStore();

// Reactive data
const isLoading = ref(true);
const error = ref<string | null>(null);
const selectedTimeRange = ref('last30days');
const selectedView = ref('overview');
const showExportOptions = ref(false);
const showCustomDateExport = ref(false);
const isMobile = ref(false);
const screenReaderMessage = ref('');

// Chart refs
const performanceTrendChart = ref<HTMLCanvasElement>();
const topicAccuracyChart = ref<HTMLCanvasElement>();
const difficultyChart = ref<HTMLCanvasElement>();
const timeDistributionChart = ref<HTMLCanvasElement>();
const sessionDurationChart = ref<HTMLCanvasElement>();
const comparisonChart = ref<HTMLCanvasElement>();
const learningCurveChart = ref<HTMLCanvasElement>();

// Chart instances
const charts = ref<Chart[]>([]);
const chartObserver = ref<IntersectionObserver | null>(null);

// Data properties
const sessionHistory = ref<StudySession[]>([]);
const questionAnalytics = ref<Record<string, any>>({});
const averageScores = ref<Record<string, number>>({
  overall: 75,
  'Network Fundamentals': 72,
  'Routing Technologies': 74,
  'Infrastructure Services': 68,
  'Security Fundamentals': 71
});

// Computed properties
const filteredSessionHistory = computed(() => {
  return filterDataByTimeRange(sessionHistory.value);
});

const performanceMetrics = computed(() => studyStore.performanceMetrics);

// Methods
const fetchAnalyticsData = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    // Fetch session history from store
    sessionHistory.value = studyStore.sessionHistory;

    // Mock question analytics data - in real app would fetch from API
    questionAnalytics.value = {
      'Network Fundamentals': {
        totalQuestions: 45,
        correctAnswers: 36,
        accuracy: 80,
        averageTime: 65,
        difficultyBreakdown: {
          1: { correct: 8, total: 10 },
          2: { correct: 7, total: 10 },
          3: { correct: 8, total: 10 },
          4: { correct: 7, total: 10 },
          5: { correct: 6, total: 5 }
        }
      },
      'Routing Technologies': {
        totalQuestions: 50,
        correctAnswers: 38,
        accuracy: 76,
        averageTime: 78,
        difficultyBreakdown: {
          1: { correct: 9, total: 10 },
          2: { correct: 8, total: 10 },
          3: { correct: 7, total: 10 },
          4: { correct: 8, total: 10 },
          5: { correct: 6, total: 10 }
        }
      }
    };

    // Initialize charts after data is loaded
    await nextTick();
    initializeCharts();

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load analytics data';
  } finally {
    isLoading.value = false;
  }
};

const initializeCharts = () => {
  // Destroy existing charts
  charts.value.forEach(chart => chart.destroy());
  charts.value = [];

  // Initialize performance trend chart
  if (performanceTrendChart.value) {
    const ctx = performanceTrendChart.value.getContext('2d');
    if (ctx) {
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: filteredSessionHistory.value.map((_, index) => `Session ${index + 1}`),
          datasets: [{
            label: 'Score %',
            data: filteredSessionHistory.value.map(session => session.score || 0),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Performance Trend Over Time'
            }
          }
        }
      });
      charts.value.push(chart);
    }
  }

  // Initialize other charts similarly...
  // Topic accuracy chart, difficulty chart, etc.
};

// Calculation methods
const calculateTotalStudyTime = (): number => {
  return filteredSessionHistory.value.reduce((total, session) => total + (session.timeSpent || 0), 0);
};

const calculateAverageScore = (): number => {
  if (filteredSessionHistory.value.length === 0) return 0;
  const totalScore = filteredSessionHistory.value.reduce((sum, session) => sum + (session.score || 0), 0);
  return totalScore / filteredSessionHistory.value.length;
};

const calculateTotalQuestions = (): number => {
  return filteredSessionHistory.value.reduce((total, session) => total + session.totalQuestions, 0);
};

const calculateOverallAccuracy = (): number => {
  const totalQuestions = calculateTotalQuestions();
  if (totalQuestions === 0) return 0;
  
  const totalCorrect = filteredSessionHistory.value.reduce((total, session) => total + session.correctAnswers, 0);
  return (totalCorrect / totalQuestions) * 100;
};

const calculateQuestionsPerHour = (): number => {
  const totalTime = calculateTotalStudyTime() / 3600; // Convert to hours
  const totalQuestions = calculateTotalQuestions();
  return totalTime > 0 ? totalQuestions / totalTime : 0;
};

const calculateAverageTimePerQuestion = (): number => {
  const totalTime = calculateTotalStudyTime();
  const totalQuestions = calculateTotalQuestions();
  return totalQuestions > 0 ? totalTime / totalQuestions : 0;
};

const calculateFastestQuestionTime = (): number => {
  // Mock implementation - in real app would analyze question-level timing data
  return 25;
};

const calculateSlowestQuestionTime = (): number => {
  // Mock implementation
  return 180;
};

const calculateScoreProgression = () => {
  return filteredSessionHistory.value.map(session => session.score || 0);
};

const calculateLearningVelocity = (): number => {
  // Mock implementation - would calculate based on knowledge acquisition rate
  return 1.2;
};

const calculateMasteryRate = (): number => {
  // Mock implementation - questions mastered per day
  return 15.5;
};

const calculateRetentionRate = (): number => {
  // Mock implementation - knowledge retention percentage
  return 87;
};

const estimateTimeToProficiency = (): number => {
  // Mock implementation - days to reach 85% proficiency
  return 45;
};

const calculatePercentileRanking = (): number => {
  const userAvg = calculateAverageScore();
  const communityAvg = averageScores.value.overall;
  
  // Simple percentile calculation - in real app would use actual distribution
  if (userAvg > communityAvg) {
    return Math.min(95, 50 + ((userAvg - communityAvg) / communityAvg) * 45);
  } else {
    return Math.max(5, 50 - ((communityAvg - userAvg) / communityAvg) * 45);
  }
};

const calculateScoreStandardDeviation = (): number => {
  const scores = filteredSessionHistory.value.map(s => s.score || 0);
  const mean = calculateAverageScore();
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  return Math.sqrt(avgSquaredDiff);
};

const calculateConfidenceInterval = () => {
  const mean = calculateAverageScore();
  const stdDev = calculateScoreStandardDeviation();
  const margin = 1.96 * (stdDev / Math.sqrt(filteredSessionHistory.value.length)); // 95% confidence
  
  return {
    lower: Math.max(0, mean - margin),
    upper: Math.min(100, mean + margin)
  };
};

const calculateTimeScoreCorrelation = (): number => {
  // Mock implementation - correlation between time spent and score
  return 0.23;
};

const calculateZScores = () => {
  const mean = calculateAverageScore();
  const stdDev = calculateScoreStandardDeviation();
  
  return filteredSessionHistory.value.map(session => {
    const score = session.score || 0;
    return stdDev > 0 ? (score - mean) / stdDev : 0;
  });
};

// Difficulty analysis methods
const getDifficultyAccuracy = (level: number): number => {
  let totalCorrect = 0;
  let totalQuestions = 0;
  
  Object.values(questionAnalytics.value).forEach((topicData: any) => {
    if (topicData.difficultyBreakdown?.[level]) {
      totalCorrect += topicData.difficultyBreakdown[level].correct;
      totalQuestions += topicData.difficultyBreakdown[level].total;
    }
  });
  
  return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
};

const getDifficultyQuestionCount = (level: number): number => {
  let totalQuestions = 0;
  
  Object.values(questionAnalytics.value).forEach((topicData: any) => {
    if (topicData.difficultyBreakdown?.[level]) {
      totalQuestions += topicData.difficultyBreakdown[level].total;
    }
  });
  
  return totalQuestions;
};

const calculateDifficultyTrends = () => {
  const trends: Record<number, any> = {};
  
  for (let level = 1; level <= 5; level++) {
    trends[level] = {
      accuracy: getDifficultyAccuracy(level),
      questionCount: getDifficultyQuestionCount(level),
      trend: 'stable' // Mock - would calculate actual trend
    };
  }
  
  return trends;
};

const getDifficultyStrengths = () => {
  const strengths = [];
  for (let level = 1; level <= 5; level++) {
    const accuracy = getDifficultyAccuracy(level);
    if (accuracy >= 80) {
      strengths.push({ level, accuracy });
    }
  }
  return strengths.sort((a, b) => b.accuracy - a.accuracy);
};

const getDifficultyWeaknesses = () => {
  const weaknesses = [];
  for (let level = 1; level <= 5; level++) {
    const accuracy = getDifficultyAccuracy(level);
    if (accuracy < 70) {
      weaknesses.push({ level, accuracy });
    }
  }
  return weaknesses.sort((a, b) => a.accuracy - b.accuracy);
};

const getDifficultyRecommendation = (): string => {
  const weaknesses = getDifficultyWeaknesses();
  if (weaknesses.length > 0) {
    return `Focus on level ${weaknesses[0].level} questions to improve your weakest area (${weaknesses[0].accuracy}% accuracy).`;
  }
  return 'Great job! Consider challenging yourself with higher difficulty questions.';
};

// Time analysis methods
const getMostEfficientTimeRange = (): string => {
  // Mock implementation - would analyze performance by time of day
  return '2-4 PM';
};

const getTimeConsistency = (): string => {
  const stdDev = calculateScoreStandardDeviation();
  if (stdDev < 5) return 'Very consistent';
  if (stdDev < 10) return 'Consistent';
  return 'Variable';
};

const getTimeEfficiencyRecommendations = (): string[] => {
  const avgTime = calculateAverageTimePerQuestion();
  const recommendations = [];
  
  if (avgTime > 90) {
    recommendations.push('Consider time management techniques to reduce average time per question');
  }
  if (avgTime < 30) {
    recommendations.push('Take more time to carefully read questions - speed vs accuracy balance');
  }
  
  recommendations.push('Practice during your most efficient hours (2-4 PM)');
  return recommendations;
};

// Comparison methods
const getCompetitiveAdvantages = (): string[] => {
  const advantages = [];
  const userAvg = calculateAverageScore();
  
  Object.entries(averageScores.value).forEach(([topic, avgScore]) => {
    // Mock - would compare user's topic performance with averages
    if (topic !== 'overall' && userAvg > avgScore) {
      advantages.push(`${topic}: ${Math.round(userAvg - avgScore)}% above average`);
    }
  });
  
  return advantages.length > 0 ? advantages : ['Developing strengths - keep practicing!'];
};

const getImprovementOpportunities = (): string[] => {
  const opportunities = [];
  const userAvg = calculateAverageScore();
  
  Object.entries(averageScores.value).forEach(([topic, avgScore]) => {
    if (topic !== 'overall' && userAvg < avgScore) {
      opportunities.push(`${topic}: ${Math.round(avgScore - userAvg)}% below average`);
    }
  });
  
  return opportunities.length > 0 ? opportunities : ['You\'re performing well across all areas!'];
};

// Trends analysis methods
const identifyPerformancePlateaus = () => {
  // Mock implementation
  return [
    { period: 'Sessions 5-8', description: 'Performance plateau around 75-80%' },
    { period: 'Recent sessions', description: 'Steady improvement trend' }
  ];
};

const getTrendAnalysisSummary = (): string => {
  const trend = performanceMetrics.value.improvementTrend;
  const velocity = calculateLearningVelocity();
  
  return `Your performance shows a ${trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'stable'} trend with a learning velocity of ${velocity}. Based on current progress, you're on track to reach proficiency within ${estimateTimeToProficiency()} days.`;
};

const getVelocityBenchmarkMessage = (): string => {
  const rate = calculateMasteryRate();
  if (rate > 20) return 'Excellent learning pace - well above average';
  if (rate > 10) return 'Good learning pace - slightly above average';
  return 'Consider increasing study frequency for faster progress';
};

// Utility methods
const filterDataByTimeRange = (data: StudySession[]) => {
  const now = new Date();
  const cutoffDate = new Date();
  
  switch (selectedTimeRange.value) {
    case 'last7days':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'last30days':
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case 'last3months':
      cutoffDate.setMonth(now.getMonth() - 3);
      break;
    case 'last6months':
      cutoffDate.setMonth(now.getMonth() - 6);
      break;
    case 'lastyear':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
    default:
      return data;
  }
  
  return data.filter(session => new Date(session.createdAt) >= cutoffDate);
};

const updateTimeRange = async (range: string) => {
  selectedTimeRange.value = range;
  await nextTick();
  updateAllCharts();
  announceDataUpdate(`Filtered to show data for ${formatTimeRange(range)}`);
};

const updateAllCharts = () => {
  // Debounced chart update
  setTimeout(() => {
    initializeCharts();
  }, 100);
};

const formatTimeRange = (range: string): string => {
  const ranges: Record<string, string> = {
    'last7days': 'the last 7 days',
    'last30days': 'the last 30 days',
    'last3months': 'the last 3 months',
    'last6months': 'the last 6 months',
    'lastyear': 'the last year',
    'all': 'all time'
  };
  
  return ranges[range] || 'selected period';
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatTrendMessage = (): string => {
  const trend = performanceMetrics.value.improvementTrend;
  if (trend > 0.1) return `Strong improvement trend (+${(trend * 100).toFixed(1)}%)`;
  if (trend > 0) return `Slight improvement trend (+${(trend * 100).toFixed(1)}%)`;
  if (trend < -0.1) return `Performance declining (${(trend * 100).toFixed(1)}%)`;
  if (trend < 0) return `Slight performance decline (${(trend * 100).toFixed(1)}%)`;
  return 'Performance stable';
};

const formatConfidenceInterval = (): string => {
  const interval = calculateConfidenceInterval();
  return `${interval.lower.toFixed(1)}% - ${interval.upper.toFixed(1)}%`;
};

// Export functionality
const exportDetailedStats = async (format: 'json' | 'csv') => {
  try {
    const data = {
      sessionHistory: filteredSessionHistory.value,
      questionAnalytics: questionAnalytics.value,
      performanceMetrics: performanceMetrics.value,
      calculatedStats: {
        averageScore: calculateAverageScore(),
        totalQuestions: calculateTotalQuestions(),
        totalStudyTime: calculateTotalStudyTime(),
        overallAccuracy: calculateOverallAccuracy()
      },
      exportedAt: new Date().toISOString(),
      timeRange: selectedTimeRange.value
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-stats-${props.examId}-${selectedTimeRange.value}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(filteredSessionHistory.value);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-stats-${props.examId}-${selectedTimeRange.value}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    showExportOptions.value = false;
    announceDataUpdate(`Statistics exported as ${format.toUpperCase()}`);
  } catch (err) {
    console.error('Export failed:', err);
  }
};

const exportToPDF = async () => {
  // Mock implementation - would use a PDF library like jsPDF
  console.log('PDF export would be implemented here');
  showExportOptions.value = false;
};

const convertToCSV = (sessions: StudySession[]): string => {
  const headers = ['Session ID', 'Date', 'Mode', 'Score', 'Questions', 'Correct', 'Time Spent'];
  const rows = sessions.map(session => [
    session.id,
    new Date(session.createdAt).toLocaleDateString(),
    session.mode,
    session.score || 0,
    session.totalQuestions,
    session.correctAnswers,
    session.timeSpent || 0
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

// Event handlers
const handleNewSessionCompleted = (sessionData: any) => {
  // Refresh data when new session is completed
  fetchAnalyticsData();
  announceDataUpdate('Analytics updated with new session data');
};

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};

const maintainScrollPosition = () => {
  // Save and restore scroll position during updates
  const scrollY = window.scrollY;
  setTimeout(() => {
    window.scrollTo(0, scrollY);
  }, 100);
};

const refreshData = async () => {
  maintainScrollPosition();
  await fetchAnalyticsData();
};

const announceDataUpdate = (message: string) => {
  screenReaderMessage.value = message;
  setTimeout(() => {
    screenReaderMessage.value = '';
  }, 1000);
};

// Lifecycle hooks
onMounted(async () => {
  // Initialize mobile detection
  handleResize();
  window.addEventListener('resize', handleResize);
  
  // Set up intersection observer for lazy loading charts
  chartObserver.value = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Initialize chart when it becomes visible
        const chartId = entry.target.getAttribute('data-chart-id');
        if (chartId) {
          // Initialize specific chart
        }
      }
    });
  });
  
  // Fetch initial data
  await fetchAnalyticsData();
  
  // Listen for study store updates
  watch(() => studyStore.sessionHistory, () => {
    updateAllCharts();
  });
});

onUnmounted(() => {
  // Cleanup
  window.removeEventListener('resize', handleResize);
  chartObserver.value?.disconnect();
  
  // Destroy all chart instances
  charts.value.forEach(chart => chart.destroy());
});

// Expose for testing
defineExpose({
  isLoading,
  error,
  selectedTimeRange,
  selectedView,
  sessionHistory,
  questionAnalytics,
  averageScores,
  filteredSessionHistory,
  isMobile,
  fetchAnalyticsData,
  calculateTotalStudyTime,
  calculateAverageScore,
  calculateTotalQuestions,
  calculateOverallAccuracy,
  calculateQuestionsPerHour,
  calculateAverageTimePerQuestion,
  calculateFastestQuestionTime,
  calculateSlowestQuestionTime,
  calculateScoreProgression,
  calculateLearningVelocity,
  calculateMasteryRate,
  calculateRetentionRate,
  estimateTimeToProficiency,
  calculatePercentileRanking,
  calculateScoreStandardDeviation,
  calculateConfidenceInterval,
  calculateTimeScoreCorrelation,
  calculateZScores,
  calculateDifficultyTrends,
  getDifficultyStrengths,
  getDifficultyWeaknesses,
  getDifficultyRecommendation,
  identifyPerformancePlateaus,
  getTrendAnalysisSummary,
  getCompetitiveAdvantages,
  getImprovementOpportunities,
  exportDetailedStats,
  exportToPDF,
  updateTimeRange,
  updateAllCharts,
  filterDataByTimeRange,
  handleNewSessionCompleted,
  maintainScrollPosition,
  refreshData,
  updateCharts: updateAllCharts,
  charts
});
</script>

<style scoped>
/* @reference to enable Tailwind in scoped styles */
.study-stats {
  font-family: 'Inter', system-ui, sans-serif;
}

/* Mobile layout styles without @apply */
.mobile-layout {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.mobile-stack > * + * {
  margin-top: 1rem;
}

.mobile-chart {
  height: 200px !important;
}

.positive-trend {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
}

.negative-trend {
  background: linear-gradient(135deg, #fee2e2, #fca5a5);
}

/* Chart responsive adjustments */
@media (max-width: 640px) {
  .mobile-chart canvas {
    max-height: 200px;
  }
}

/* Print styles */
@media print {
  .study-stats {
    background-color: white;
  }
  
  button, .export-button {
    display: none !important;
  }
  
  .chart-container {
    break-inside: avoid;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .bg-gradient-to-r {
    background-color: white;
    border-width: 2px;
  }
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus management */
.study-stats:focus-within {
  outline: none;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .transition-all,
  .transition-colors {
    transition: none;
  }
}
</style>