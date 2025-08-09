<template>
  <div
    data-test="progress-dashboard"
    role="region"
    aria-label="Progress Dashboard - Track your study progress and performance"
    :class="[
      'progress-dashboard bg-gray-50 min-h-screen p-4',
      {
        'mobile-layout': isMobile,
        'mobile-stack': isMobile
      }
    ]"
  >
    <!-- Loading State -->
    <div
      v-if="isLoading"
      data-test="loading-state"
      class="flex items-center justify-center min-h-96"
    >
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-lg text-gray-600">Loading progress data...</p>
        <p class="text-sm text-gray-500 mt-2">Analyzing your study performance</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      data-test="error-state"
      class="flex items-center justify-center min-h-96"
    >
      <div class="text-center max-w-md">
        <div class="text-red-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Unable to Load Progress</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button
          data-test="retry-button"
          @click="fetchProgressData"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!progressData && sessionHistory.length === 0"
      data-test="empty-state"
      class="text-center py-12"
    >
      <div class="text-gray-400 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">No Progress Data Available</h2>
      <p class="text-gray-600 mb-4">Start studying to see your progress and statistics here.</p>
      <button
        @click="$emit('start-study')"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Start Studying
      </button>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Study Progress</h1>
            <p class="text-gray-600 mt-1">Track your learning journey and performance</p>
          </div>

          <!-- Time Period Selector -->
          <div class="flex items-center space-x-4">
            <label for="time-period" class="text-sm font-medium text-gray-700">
              Time Period:
            </label>
            <select
              id="time-period"
              data-test="time-period-selector"
              v-model="selectedTimePeriod"
              @change="updateTimePeriod"
              class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option data-test="time-period-option" value="last7days">Last 7 days</option>
              <option data-test="time-period-option" value="last30days">Last 30 days</option>
              <option data-test="time-period-option" value="last3months">Last 3 months</option>
              <option data-test="time-period-option" value="all">All time</option>
            </select>

            <!-- Export Button -->
            <button
              data-test="export-progress"
              @click="showExportOptions = !showExportOptions"
              class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Export Data
            </button>

            <!-- Export Options Dropdown -->
            <div
              v-if="showExportOptions"
              data-test="export-format-options"
              class="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
            >
              <button
                @click="exportProgressData('json')"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export as JSON
              </button>
              <button
                @click="exportProgressData('csv')"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Cards -->
      <div data-test="dashboard-cards" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Overall Progress Card -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-gray-900">Overall Progress</h2>
              <div class="text-sm text-gray-500">
                Last updated: {{ formatDate(progressData?.updatedAt) }}
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Progress Ring -->
              <div class="flex items-center justify-center">
                <div class="relative">
                  <svg
                    data-test="progress-ring"
                    class="w-48 h-48 transform -rotate-90"
                    viewBox="0 0 200 200"
                    aria-hidden="true"
                  >
                    <!-- Background circle -->
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#e5e7eb"
                      stroke-width="8"
                    />
                    <!-- Progress circle -->
                    <circle
                      data-test="progress-path"
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      :stroke="getProgressColor(overallCompletion)"
                      stroke-width="8"
                      stroke-linecap="round"
                      :stroke-dasharray="`${overallCompletion * 5.026} 502.6`"
                      class="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <!-- Center text -->
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      data-test="overall-completion"
                      class="text-3xl font-bold text-gray-900"
                    >
                      {{ Math.round(overallCompletion) }}%
                    </span>
                    <span class="text-sm text-gray-600">Complete</span>
                  </div>
                </div>
              </div>

              <!-- Progress Stats -->
              <div class="space-y-6">
                <div>
                  <h3 class="text-sm font-medium text-gray-700 mb-3">Study Statistics</h3>
                  <div class="space-y-3">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Questions Answered:</span>
                      <span data-test="questions-answered" class="font-medium text-gray-900">
                        {{ progressData?.questionsAnswered || 0 }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Correct Answers:</span>
                      <span data-test="correct-answers" class="font-medium text-gray-900">
                        {{ progressData?.correctAnswers || 0 }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Average Score:</span>
                      <span data-test="average-score" class="font-medium text-gray-900">
                        {{ Math.round(progressData?.averageScore || 0) }}%
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Total Time:</span>
                      <span class="font-medium text-gray-900">
                        {{ formatDuration(performanceMetrics.totalTimeSpent) }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Sessions Completed:</span>
                      <span class="font-medium text-gray-900">
                        {{ performanceMetrics.totalSessions }}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-700 mb-3">Study Streak</h3>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Current Streak:</span>
                      <span data-test="current-streak" class="font-medium text-blue-600">
                        {{ performanceMetrics.streak }} days
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Best Streak:</span>
                      <span data-test="best-streak" class="font-medium text-green-600">
                        {{ performanceMetrics.bestStreak }} days
                      </span>
                    </div>
                    <div data-test="streak-message" class="text-sm text-gray-500 mt-2">
                      {{ getStreakMessage() }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats Sidebar -->
        <div class="space-y-6">
          <!-- Completion Estimates -->
          <div class="bg-white rounded-lg border border-gray-200 p-4">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Completion Estimates</h3>
            <div data-test="completion-estimate" class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">80% Mastery:</span>
                <span data-test="estimate-80-percent" class="text-sm font-medium text-gray-900">
                  {{ formatEstimate(calculateCompletionEstimate(80)) }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">100% Complete:</span>
                <span data-test="estimate-100-percent" class="text-sm font-medium text-gray-900">
                  {{ formatEstimate(calculateCompletionEstimate(100)) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Last Activity -->
          <div class="bg-white rounded-lg border border-gray-200 p-4">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Last Activity</h3>
            <div data-test="last-activity" class="text-sm text-gray-600">
              {{ formatRelativeDate(progressData?.lastActivityAt) }}
            </div>
          </div>

          <!-- Improvement Trend -->
          <div class="bg-white rounded-lg border border-gray-200 p-4">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Performance Trend</h3>
            <div class="flex items-center space-x-2">
              <div
                :class="[
                  'flex items-center justify-center w-8 h-8 rounded-full',
                  performanceMetrics.improvementTrend >= 0
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                ]"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    v-if="performanceMetrics.improvementTrend >= 0"
                    fill-rule="evenodd"
                    d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                  <path
                    v-else
                    fill-rule="evenodd"
                    d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="text-sm">
                <div class="font-medium text-gray-900">
                  {{ performanceMetrics.improvementTrend >= 0 ? 'Improving' : 'Declining' }}
                </div>
                <div class="text-gray-500">
                  {{ Math.abs(Math.round(performanceMetrics.improvementTrend * 100)) }}% change
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Chart -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Performance Over Time</h2>
          <div data-test="chart-legend" class="flex items-center space-x-4 text-sm">
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span class="text-gray-600">Score</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="text-gray-600">Accuracy</span>
            </div>
          </div>
        </div>

        <div v-if="filteredSessionHistory.length === 0" data-test="no-chart-data" class="text-center py-8">
          <p class="text-gray-500">No study data available for the selected time period.</p>
        </div>

        <div v-else class="relative">
          <canvas
            ref="performanceChartCanvas"
            data-test="performance-chart"
            :class="[
              'w-full',
              isMobile ? 'mobile-chart h-64' : 'h-80'
            ]"
            role="img"
            :aria-label="`Performance chart showing scores and accuracy over ${selectedTimePeriod}`"
          ></canvas>
        </div>
      </div>

      <!-- Objective Progress -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Progress by Topic</h2>
          <div class="flex items-center space-x-2">
            <label for="sort-order" class="text-sm text-gray-600">Sort by:</label>
            <select
              id="sort-order"
              v-model="sortOrder"
              @change="sortObjectives"
              class="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="desc">Highest first</option>
              <option value="asc">Lowest first</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        <div class="space-y-4">
          <div
            v-for="[objective, data] in sortedObjectiveProgress"
            :key="objective"
            :data-test="`objective-${objective.replace(/\s+/g, '-').toLowerCase()}`"
            :class="[
              'objective-progress-item p-4 rounded-lg border transition-colors',
              {
                'bg-green-50 border-green-200 high-progress': data.percentage >= 75,
                'bg-yellow-50 border-yellow-200 medium-progress': data.percentage >= 60 && data.percentage < 75,
                'bg-red-50 border-red-200 low-progress': data.percentage < 60
              }
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-medium text-gray-900">{{ objective }}</h3>
              <div class="flex items-center space-x-2">
                <span :data-test="`objective-count-${objective.replace(/\s+/g, '-').toLowerCase()}`" class="text-sm text-gray-600">
                  {{ data.correct }}/{{ data.total }}
                </span>
                <span :data-test="`objective-percentage-${objective.replace(/\s+/g, '-').toLowerCase()}`" class="font-medium text-gray-900">
                  {{ data.percentage }}%
                </span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div
              data-test="objective-progress-bar"
              role="progressbar"
              :aria-valuenow="data.percentage"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`${objective}: ${data.percentage}% complete`"
              class="w-full bg-gray-200 rounded-full h-2"
            >
              <div
                :class="[
                  'h-2 rounded-full transition-all duration-500',
                  {
                    'bg-green-500': data.percentage >= 75,
                    'bg-yellow-500': data.percentage >= 60 && data.percentage < 75,
                    'bg-red-500': data.percentage < 60
                  }
                ]"
                :style="`width: ${data.percentage}%`"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity Timeline -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
        
        <div v-if="recentSessionHistory.length === 0" class="text-center py-8">
          <p class="text-gray-500">No recent study activity found.</p>
        </div>

        <div v-else data-test="activity-timeline" class="space-y-4">
          <div
            v-for="session in recentSessionHistory"
            :key="session.id"
            data-test="timeline-item"
            class="flex items-start space-x-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <!-- Session Icon -->
            <div
              :class="[
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                {
                  'bg-blue-100 text-blue-600': session.mode === 'practice',
                  'bg-purple-100 text-purple-600': session.mode === 'timed',
                  'bg-red-100 text-red-600': session.mode === 'exam'
                }
              ]"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <!-- Session Details -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span
                    data-test="session-mode-badge"
                    :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      {
                        'bg-blue-100 text-blue-800': session.mode === 'practice',
                        'bg-purple-100 text-purple-800': session.mode === 'timed',
                        'bg-red-100 text-red-800': session.mode === 'exam'
                      }
                    ]"
                  >
                    {{ session.mode.charAt(0).toUpperCase() + session.mode.slice(1) }}
                  </span>
                  <span class="text-sm text-gray-900 font-medium">
                    {{ session.score || 0 }}% • {{ session.totalQuestions }} questions
                  </span>
                </div>
                <span data-test="session-date" class="text-sm text-gray-500">
                  {{ formatRelativeDate(session.completedAt) }}
                </span>
              </div>
              <div class="mt-1 text-sm text-gray-600">
                {{ session.correctAnswers }}/{{ session.totalQuestions }} correct
                <span v-if="session.timeSpent"> • {{ formatDuration(session.timeSpent) }}</span>
              </div>
            </div>
          </div>

          <!-- View All Sessions Link -->
          <div v-if="sessionHistory.length > 5" class="text-center pt-4">
            <button
              data-test="view-all-sessions"
              @click="$emit('view-all-sessions')"
              class="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View all {{ sessionHistory.length }} sessions →
            </button>
          </div>
        </div>
      </div>

      <!-- Weak Areas and Recommendations -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Study Recommendations</h2>
        
        <div data-test="weak-areas" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Weak Areas -->
          <div v-if="weakAreas.length > 0">
            <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg class="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              Areas Needing Focus
            </h3>
            <div class="space-y-3">
              <div
                v-for="area in weakAreas"
                :key="area"
                class="p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div class="text-sm font-medium text-red-800">{{ area }}</div>
                <div data-test="improvement-suggestion" class="text-xs text-red-600 mt-1">
                  {{ getImprovementSuggestion(area) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Strong Areas -->
          <div v-if="strongAreas.length > 0">
            <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              Strong Areas
            </h3>
            <div class="space-y-3">
              <div
                v-for="area in strongAreas"
                :key="area"
                class="p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div class="text-sm font-medium text-green-800">{{ area }}</div>
                <div class="text-xs text-green-600 mt-1">
                  Great job! Consider reviewing occasionally to maintain proficiency.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- General Recommendations -->
        <div data-test="study-recommendations" class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 class="text-sm font-medium text-blue-800 mb-2">Recommended Study Plan</h3>
          <div class="text-sm text-blue-700">
            {{ getStudyRecommendation() }}
          </div>
        </div>
      </div>

      <!-- Streak Calendar (Simplified) -->
      <div v-if="!isVerySmallScreen" class="bg-white rounded-lg border border-gray-200 p-6 mt-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Study Streak Calendar</h2>
        <div data-test="streak-calendar" class="grid grid-cols-7 gap-2 text-center">
          <div
            v-for="day in last30Days"
            :key="day.date"
            :class="[
              'w-8 h-8 rounded text-xs flex items-center justify-center',
              {
                'bg-green-200 text-green-800': day.hasActivity,
                'bg-gray-100 text-gray-400': !day.hasActivity,
                'bg-green-500 text-white': day.isToday && day.hasActivity
              }
            ]"
            :title="`${day.date}: ${day.hasActivity ? 'Study completed' : 'No activity'}`"
          >
            {{ day.dayOfMonth }}
          </div>
        </div>
        <div class="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Less</span>
          <div class="flex items-center space-x-1">
            <div class="w-3 h-3 bg-gray-100 rounded"></div>
            <div class="w-3 h-3 bg-green-100 rounded"></div>
            <div class="w-3 h-3 bg-green-200 rounded"></div>
            <div class="w-3 h-3 bg-green-300 rounded"></div>
            <div class="w-3 h-3 bg-green-500 rounded"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      <!-- Simplified Progress View (Very Small Screens) -->
      <div v-if="isVerySmallScreen" data-test="simplified-progress" class="mt-8">
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Progress</h2>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Overall Progress:</span>
              <span class="font-medium">{{ Math.round(overallCompletion) }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Current Streak:</span>
              <span class="font-medium text-blue-600">{{ performanceMetrics.streak }} days</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Last Score:</span>
              <span class="font-medium">{{ lastSessionScore }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Screen Reader Live Region -->
    <div class="sr-only" aria-live="polite">
      <span>{{ screenReaderMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import { useStudyStore } from '~/stores/study';
import type { UserProgress, StudySession } from '~/types/exam';

// Register Chart.js components
Chart.register(...registerables);

// Props
interface Props {
  examId?: string;
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  refreshInterval: 60000 // 1 minute
});

// Emits
const emit = defineEmits<{
  'start-study': [];
  'view-all-sessions': [];
  'session-completed': [sessionData: any];
}>();

// Store
const studyStore = useStudyStore();

// Local state
const isLoading = ref(true);
const error = ref<string | null>(null);
const progressData = ref<UserProgress | null>(null);
const sessionHistory = ref<StudySession[]>([]);
const objectiveProgress = ref<Record<string, { correct: number; total: number; percentage: number }>>({});
const selectedTimePeriod = ref('last30days');
const sortOrder = ref('desc');
const showExportOptions = ref(false);
const isMobile = ref(false);
const isVerySmallScreen = ref(false);
const screenReaderMessage = ref('');

// Chart instance
const performanceChartCanvas = ref<HTMLCanvasElement | null>(null);
let performanceChart: Chart | null = null;
let chartObserver: IntersectionObserver | null = null;
let refreshInterval: NodeJS.Timeout | null = null;

// Computed properties
const performanceMetrics = computed(() => studyStore.performanceMetrics);

const overallCompletion = computed(() => {
  if (!progressData.value) return 0;
  return progressData.value.questionsAnswered > 0 
    ? (progressData.value.correctAnswers / progressData.value.questionsAnswered) * 100 
    : 0;
});

const filteredSessionHistory = computed(() => {
  return getFilteredSessions();
});

const recentSessionHistory = computed(() => {
  return sessionHistory.value
    .filter(session => session.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5);
});

const sortedObjectiveProgress = computed(() => {
  const entries = Object.entries(objectiveProgress.value);
  
  switch (sortOrder.value) {
    case 'asc':
      return entries.sort(([, a], [, b]) => a.percentage - b.percentage);
    case 'desc':
      return entries.sort(([, a], [, b]) => b.percentage - a.percentage);
    case 'name':
      return entries.sort(([a], [b]) => a.localeCompare(b));
    default:
      return entries;
  }
});

const weakAreas = computed(() => {
  return Object.entries(objectiveProgress.value)
    .filter(([, data]) => data.percentage < 60)
    .map(([objective]) => objective);
});

const strongAreas = computed(() => {
  return Object.entries(objectiveProgress.value)
    .filter(([, data]) => data.percentage >= 75)
    .map(([objective]) => objective);
});

const last30Days = computed(() => {
  const days = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const hasActivity = sessionHistory.value.some(session => {
      const sessionDate = new Date(session.completedAt || session.createdAt);
      return sessionDate.toDateString() === date.toDateString();
    });
    
    days.push({
      date: date.toISOString().split('T')[0],
      dayOfMonth: date.getDate(),
      hasActivity,
      isToday: date.toDateString() === today.toDateString()
    });
  }
  
  return days;
});

const lastSessionScore = computed(() => {
  const lastSession = recentSessionHistory.value[0];
  return lastSession?.score || 0;
});

// Methods
const fetchProgressData = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    // In a real implementation, these would be API calls
    await Promise.all([
      fetchUserProgress(),
      fetchSessionHistory(),
      fetchObjectiveProgress()
    ]);

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load progress data';
    console.error('Progress data fetch error:', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchUserProgress = async () => {
  // Mock API call - replace with actual API
  await new Promise(resolve => setTimeout(resolve, 500));
  
  progressData.value = {
    id: 'progress1',
    userId: props.userId,
    examId: props.examId,
    questionsAnswered: 85,
    correctAnswers: 68,
    averageScore: 80,
    lastActivityAt: new Date(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    updatedAt: new Date()
  };
};

const fetchSessionHistory = async () => {
  // Mock API call - replace with actual API
  await new Promise(resolve => setTimeout(resolve, 300));
  
  sessionHistory.value = studyStore.sessionHistory.length > 0 
    ? studyStore.sessionHistory 
    : generateMockSessionHistory();
};

const fetchObjectiveProgress = async () => {
  // Mock API call - replace with actual API
  await new Promise(resolve => setTimeout(resolve, 200));
  
  objectiveProgress.value = {
    'Network Fundamentals': { correct: 18, total: 25, percentage: 72 },
    'Routing Technologies': { correct: 22, total: 30, percentage: 73 },
    'Switching Technologies': { correct: 15, total: 20, percentage: 75 },
    'Infrastructure Services': { correct: 8, total: 15, percentage: 53 },
    'Security Fundamentals': { correct: 12, total: 18, percentage: 67 }
  };
};

const generateMockSessionHistory = (): StudySession[] => {
  const sessions: StudySession[] = [];
  const modes: Array<'practice' | 'timed' | 'exam'> = ['practice', 'timed', 'exam'];
  
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    const totalQuestions = 20 + Math.floor(Math.random() * 30);
    const correctAnswers = Math.floor(totalQuestions * (0.6 + Math.random() * 0.35));
    
    sessions.push({
      id: `session-${i}`,
      userId: props.userId,
      examId: props.examId,
      mode: modes[Math.floor(Math.random() * modes.length)],
      totalQuestions,
      correctAnswers,
      timeSpent: 1800 + Math.floor(Math.random() * 1800), // 30-60 minutes
      score: Math.round((correctAnswers / totalQuestions) * 100),
      completedAt: date,
      createdAt: new Date(date.getTime() - 3600000) // 1 hour before completion
    });
  }
  
  return sessions.sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
};

const initializeChart = () => {
  if (!performanceChartCanvas.value) return;
  
  const ctx = performanceChartCanvas.value.getContext('2d');
  if (!ctx) return;

  performanceChart = new Chart(ctx, {
    type: 'line',
    data: getChartData(),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // We have a custom legend
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (tooltipItems) => {
              const item = tooltipItems[0];
              return `Session ${item.dataIndex + 1}`;
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}${context.dataset.label?.includes('Score') ? '%' : ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Study Sessions'
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Percentage'
          }
        }
      },
      elements: {
        point: {
          radius: 4,
          hoverRadius: 6
        },
        line: {
          tension: 0.3
        }
      }
    }
  });
};

const getChartData = () => {
  const sessions = filteredSessionHistory.value.slice(-10); // Last 10 sessions
  
  return {
    labels: sessions.map((_, index) => `Session ${index + 1}`),
    datasets: [
      {
        label: 'Score',
        data: sessions.map(session => session.score || 0),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F640',
        fill: false
      },
      {
        label: 'Accuracy',
        data: sessions.map(session => 
          session.totalQuestions > 0 
            ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
            : 0
        ),
        borderColor: '#10B981',
        backgroundColor: '#10B98140',
        fill: false
      }
    ]
  };
};

const updateChart = () => {
  if (!performanceChart) return;
  
  performanceChart.data = getChartData();
  performanceChart.update();
};

const getFilteredSessions = () => {
  const now = new Date();
  let cutoffDate = new Date(now);
  
  switch (selectedTimePeriod.value) {
    case 'last7days':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'last30days':
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case 'last3months':
      cutoffDate.setMonth(now.getMonth() - 3);
      break;
    case 'all':
    default:
      cutoffDate = new Date(0); // Beginning of time
      break;
  }
  
  return sessionHistory.value.filter(session => {
    const sessionDate = new Date(session.completedAt || session.createdAt);
    return sessionDate >= cutoffDate;
  });
};

const updateTimePeriod = async (newPeriod?: string) => {
  if (newPeriod) {
    selectedTimePeriod.value = newPeriod;
  }
  
  await nextTick();
  updateChart();
  
  screenReaderMessage.value = `Chart updated to show data for ${selectedTimePeriod.value}`;
  setTimeout(() => screenReaderMessage.value = '', 2000);
};

const sortObjectives = () => {
  // Trigger reactivity by updating the computed property
  nextTick();
};

const calculateCompletionEstimate = (targetPercentage: number = 100): number => {
  if (!progressData.value || overallCompletion.value >= targetPercentage) return 0;
  
  const currentProgress = overallCompletion.value;
  const progressNeeded = targetPercentage - currentProgress;
  
  // Calculate average progress per day based on recent sessions
  const recentSessions = filteredSessionHistory.value.slice(0, 7); // Last 7 sessions
  if (recentSessions.length < 2) return 30; // Default estimate
  
  const oldestSession = recentSessions[recentSessions.length - 1];
  const daysSinceOldest = Math.ceil(
    (Date.now() - new Date(oldestSession.completedAt || oldestSession.createdAt).getTime()) 
    / (24 * 60 * 60 * 1000)
  );
  
  const progressPerDay = recentSessions.length / daysSinceOldest * 2; // Rough estimate
  
  return Math.ceil(progressNeeded / progressPerDay);
};

const exportProgressData = (format: 'json' | 'csv') => {
  showExportOptions.value = false;
  
  const data = {
    progressData: progressData.value,
    sessionHistory: sessionHistory.value,
    objectiveProgress: objectiveProgress.value,
    performanceMetrics: performanceMetrics.value,
    exportedAt: new Date().toISOString()
  };
  
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, `progress-data-${props.examId}.json`);
  } else if (format === 'csv') {
    // Convert to CSV format
    const csvData = convertToCSV(sessionHistory.value);
    const blob = new Blob([csvData], { type: 'text/csv' });
    downloadFile(blob, `progress-data-${props.examId}.csv`);
  }
};

const convertToCSV = (sessions: StudySession[]): string => {
  const headers = ['Date', 'Mode', 'Score', 'Questions', 'Correct', 'Time Spent'];
  const rows = sessions.map(session => [
    new Date(session.completedAt || session.createdAt).toLocaleDateString(),
    session.mode,
    session.score || 0,
    session.totalQuestions,
    session.correctAnswers,
    formatDuration(session.timeSpent || 0)
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Helper methods
const getProgressColor = (percentage: number): string => {
  if (percentage >= 75) return '#10B981'; // green
  if (percentage >= 60) return '#F59E0B'; // yellow
  return '#EF4444'; // red
};

const getStreakMessage = (): string => {
  const streak = performanceMetrics.value.streak;
  
  if (streak === 0) return 'Start your study streak today!';
  if (streak < 7) return 'Great start! Keep it going!';
  if (streak < 30) return 'Excellent consistency!';
  return 'Amazing dedication! You\'re on fire! 🔥';
};

const getImprovementSuggestion = (area: string): string => {
  const suggestions = {
    'Network Fundamentals': 'Review OSI model and network protocols',
    'Routing Technologies': 'Practice routing table configurations',
    'Switching Technologies': 'Focus on VLAN and STP concepts',
    'Infrastructure Services': 'Study DHCP, DNS, and NAT services',
    'Security Fundamentals': 'Review access control and security protocols'
  };
  
  return suggestions[area as keyof typeof suggestions] || 'Focus on practice questions and review explanations';
};

const getStudyRecommendation = (): string => {
  const weakCount = weakAreas.value.length;
  const strongCount = strongAreas.value.length;
  
  if (weakCount === 0) {
    return 'Excellent progress! Continue with mixed practice sessions to maintain your knowledge.';
  } else if (weakCount > 2) {
    return `Focus on ${weakAreas.value.slice(0, 2).join(' and ')} with targeted practice sessions.`;
  } else {
    return `Concentrate on ${weakAreas.value.join(' and ')} to improve your overall score.`;
  }
};

const formatDate = (date?: Date): string => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString();
};

const formatRelativeDate = (date?: Date): string => {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatEstimate = (days: number): string => {
  if (days === 0) return 'Completed!';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} months`;
};

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
  isVerySmallScreen.value = window.innerWidth < 480;
  
  if (performanceChart) {
    performanceChart.resize();
  }
};

const setupIntersectionObserver = () => {
  if (!performanceChartCanvas.value) return;
  
  chartObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !performanceChart) {
          initializeChart();
        }
      });
    },
    { threshold: 0.1 }
  );
  
  chartObserver.observe(performanceChartCanvas.value);
};

const handleSessionCompleted = (sessionData: any) => {
  // Refresh data when a session is completed
  fetchProgressData();
  emit('session-completed', sessionData);
};

const updateProgress = (newProgressData: Partial<UserProgress>) => {
  if (progressData.value) {
    Object.assign(progressData.value, newProgressData);
  }
};

// Lifecycle
onMounted(async () => {
  handleResize();
  window.addEventListener('resize', handleResize);
  
  await fetchProgressData();
  
  await nextTick();
  setupIntersectionObserver();
  
  // Setup auto-refresh if enabled
  if (props.autoRefresh) {
    refreshInterval = setInterval(fetchProgressData, props.refreshInterval);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  
  if (performanceChart) {
    performanceChart.destroy();
  }
  
  if (chartObserver) {
    chartObserver.disconnect();
  }
  
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

// Watch for changes
watch(selectedTimePeriod, () => {
  updateTimePeriod();
});

// Expose for testing
defineExpose({
  isLoading,
  error,
  progressData,
  sessionHistory,
  objectiveProgress,
  selectedTimePeriod,
  sortOrder,
  isMobile,
  isVerySmallScreen,
  performanceChart,
  overallCompletion,
  filteredSessionHistory,
  calculateCompletionEstimate,
  fetchProgressData,
  updateTimePeriod,
  exportProgressData,
  handleSessionCompleted,
  updateProgress,
  getFilteredSessions,
  getChartData,
  updateChart
});
</script>

<style scoped>
.progress-dashboard {
  transition: all 0.2s ease-in-out;
}

.mobile-layout {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.mobile-stack .grid {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.mobile-chart {
  max-height: 256px;
}

.objective-progress-item {
  transition: all 0.2s ease-in-out;
}

.objective-progress-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Progress ring animation */
.progress-path {
  stroke-dashoffset: 0;
  animation: progress-fill 2s ease-out;
}

@keyframes progress-fill {
  from {
    stroke-dashoffset: 502.6;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .progress-dashboard,
  .objective-progress-item,
  .progress-path {
    transition: none;
    animation: none;
  }
}

/* Print styles */
@media print {
  .progress-dashboard {
    background-color: white;
  }
  
  .bg-gray-50 {
    background-color: white;
  }
  
  button,
  select {
    display: none !important;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .bg-gray-50 {
    background-color: white;
  }
  
  .border-gray-200 {
    border-color: rgb(31 41 55);
  }
  
  .text-gray-600 {
    color: rgb(17 24 39);
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
</style>