#!/usr/bin/env node

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

/**
 * Performance monitoring script
 * Runs Lighthouse audits and sends alerts if performance degrades
 */
class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      url: config.url || 'http://localhost:3000',
      outputDir: config.outputDir || './performance-reports',
      thresholds: {
        performance: 90,
        accessibility: 90,
        'best-practices': 90,
        seo: 90,
        'first-contentful-paint': 2000,
        'largest-contentful-paint': 2500,
        'speed-index': 3000,
        'interactive': 3000,
        'cumulative-layout-shift': 0.1,
        ...config.thresholds
      },
      webhookUrl: config.webhookUrl,
      email: config.email,
      ...config
    };
  }

  async runAudit() {
    console.log('🚀 Starting performance audit...');
    
    const chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
    });

    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    };

    try {
      const runnerResult = await lighthouse(this.config.url, options);
      await chrome.kill();

      const report = runnerResult.lhr;
      const timestamp = new Date().toISOString();
      
      // Save report
      await this.saveReport(report, timestamp);
      
      // Analyze results
      const analysis = this.analyzeResults(report);
      
      // Send alerts if needed
      if (analysis.hasIssues) {
        await this.sendAlert(analysis, timestamp);
      }

      console.log('✅ Performance audit completed');
      return analysis;

    } catch (error) {
      await chrome.kill();
      console.error('❌ Performance audit failed:', error);
      throw error;
    }
  }

  async saveReport(report, timestamp) {
    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });
    
    const filename = `performance-${timestamp.replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(this.config.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`📊 Report saved to ${filepath}`);

    // Also save a latest.json for easy access
    const latestPath = path.join(this.config.outputDir, 'latest.json');
    await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
  }

  analyzeResults(report) {
    const issues = [];
    const warnings = [];
    
    // Check category scores
    Object.entries(report.categories).forEach(([category, data]) => {
      const score = data.score * 100;
      const threshold = this.config.thresholds[category];
      
      if (threshold && score < threshold) {
        issues.push({
          type: 'category',
          category,
          score,
          threshold,
          message: `${category} score (${score.toFixed(1)}) is below threshold (${threshold})`
        });
      }
    });

    // Check specific metrics
    const metricsToCheck = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'speed-index',
      'interactive',
      'cumulative-layout-shift'
    ];

    metricsToCheck.forEach(metric => {
      const audit = report.audits[metric];
      if (audit && audit.numericValue !== undefined) {
        const value = audit.numericValue;
        const threshold = this.config.thresholds[metric];
        
        if (threshold && value > threshold) {
          const severity = value > threshold * 1.5 ? 'critical' : 'warning';
          const issue = {
            type: 'metric',
            metric,
            value,
            threshold,
            severity,
            message: `${metric} (${value.toFixed(0)}ms) exceeds threshold (${threshold}ms)`
          };
          
          if (severity === 'critical') {
            issues.push(issue);
          } else {
            warnings.push(issue);
          }
        }
      }
    });

    // Check for performance opportunities
    const opportunities = [];
    Object.entries(report.audits).forEach(([auditId, audit]) => {
      if (audit.details && audit.details.type === 'opportunity' && audit.numericValue > 100) {
        opportunities.push({
          id: auditId,
          title: audit.title,
          description: audit.description,
          savings: audit.numericValue,
          displayValue: audit.displayValue
        });
      }
    });

    const analysis = {
      timestamp: new Date().toISOString(),
      url: this.config.url,
      scores: Object.fromEntries(
        Object.entries(report.categories).map(([key, data]) => [key, data.score * 100])
      ),
      metrics: Object.fromEntries(
        metricsToCheck.map(metric => [
          metric,
          report.audits[metric]?.numericValue || null
        ])
      ),
      issues,
      warnings,
      opportunities: opportunities.slice(0, 5), // Top 5 opportunities
      hasIssues: issues.length > 0,
      overallScore: report.categories.performance.score * 100
    };

    return analysis;
  }

  async sendAlert(analysis, timestamp) {
    const alertData = {
      timestamp,
      url: this.config.url,
      overallScore: analysis.overallScore,
      issues: analysis.issues,
      warnings: analysis.warnings,
      opportunities: analysis.opportunities
    };

    // Send webhook alert
    if (this.config.webhookUrl) {
      await this.sendWebhookAlert(alertData);
    }

    // Send email alert
    if (this.config.email) {
      await this.sendEmailAlert(alertData);
    }

    // Log to console
    console.log('🚨 Performance issues detected:');
    analysis.issues.forEach(issue => {
      console.log(`  - ${issue.message}`);
    });
  }

  async sendWebhookAlert(alertData) {
    try {
      const fetch = (await import('node-fetch')).default;
      
      const payload = {
        text: '🚨 Performance Alert',
        attachments: [{
          color: 'danger',
          title: `Performance issues detected for ${alertData.url}`,
          fields: [
            {
              title: 'Overall Performance Score',
              value: `${alertData.overallScore.toFixed(1)}%`,
              short: true
            },
            {
              title: 'Issues Found',
              value: alertData.issues.length.toString(),
              short: true
            },
            {
              title: 'Critical Issues',
              value: alertData.issues.map(issue => `• ${issue.message}`).join('\n') || 'None',
              short: false
            }
          ],
          timestamp: alertData.timestamp
        }]
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('📤 Webhook alert sent successfully');
      } else {
        console.error('❌ Failed to send webhook alert:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error sending webhook alert:', error);
    }
  }

  async sendEmailAlert(alertData) {
    // This would integrate with your email service (SendGrid, SES, etc.)
    console.log('📧 Email alert would be sent to:', this.config.email);
    console.log('Alert data:', JSON.stringify(alertData, null, 2));
  }

  async generateHistoricalReport() {
    console.log('📈 Generating historical performance report...');
    
    try {
      const files = await fs.readdir(this.config.outputDir);
      const reportFiles = files.filter(file => file.startsWith('performance-') && file.endsWith('.json'));
      
      const reports = [];
      for (const file of reportFiles.slice(-30)) { // Last 30 reports
        const filepath = path.join(this.config.outputDir, file);
        const content = await fs.readFile(filepath, 'utf8');
        const report = JSON.parse(content);
        
        reports.push({
          timestamp: file.match(/performance-(.+)\.json/)[1].replace(/-/g, ':'),
          performanceScore: report.categories.performance.score * 100,
          fcp: report.audits['first-contentful-paint']?.numericValue,
          lcp: report.audits['largest-contentful-paint']?.numericValue,
          si: report.audits['speed-index']?.numericValue,
          tti: report.audits['interactive']?.numericValue,
          cls: report.audits['cumulative-layout-shift']?.numericValue
        });
      }

      const historyPath = path.join(this.config.outputDir, 'history.json');
      await fs.writeFile(historyPath, JSON.stringify(reports, null, 2));
      
      console.log(`📊 Historical report saved to ${historyPath}`);
      return reports;
    } catch (error) {
      console.error('❌ Error generating historical report:', error);
    }
  }
}

// CLI usage
if (require.main === module) {
  const config = {
    url: process.env.MONITOR_URL || 'http://localhost:3000',
    outputDir: process.env.OUTPUT_DIR || './performance-reports',
    webhookUrl: process.env.WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
    thresholds: {
      performance: parseInt(process.env.PERF_THRESHOLD) || 90,
      'first-contentful-paint': parseInt(process.env.FCP_THRESHOLD) || 2000,
      'largest-contentful-paint': parseInt(process.env.LCP_THRESHOLD) || 2500,
    }
  };

  const monitor = new PerformanceMonitor(config);
  
  const command = process.argv[2];
  
  switch (command) {
    case 'audit':
      monitor.runAudit().catch(console.error);
      break;
    case 'history':
      monitor.generateHistoricalReport().catch(console.error);
      break;
    case 'watch':
      // Run audit every hour
      console.log('👀 Starting performance monitoring (hourly audits)...');
      setInterval(() => {
        monitor.runAudit().catch(console.error);
      }, 60 * 60 * 1000);
      // Run initial audit
      monitor.runAudit().catch(console.error);
      break;
    default:
      console.log(`
Usage: node performance-monitor.js <command>

Commands:
  audit    Run a single performance audit
  history  Generate historical performance report
  watch    Start continuous monitoring (hourly audits)

Environment variables:
  MONITOR_URL       URL to monitor (default: http://localhost:3000)
  OUTPUT_DIR        Output directory for reports (default: ./performance-reports)
  WEBHOOK_URL       Slack/Discord webhook URL for alerts
  ALERT_EMAIL       Email address for alerts
  PERF_THRESHOLD    Performance score threshold (default: 90)
  FCP_THRESHOLD     First Contentful Paint threshold in ms (default: 2000)
  LCP_THRESHOLD     Largest Contentful Paint threshold in ms (default: 2500)
      `);
  }
}

module.exports = PerformanceMonitor;