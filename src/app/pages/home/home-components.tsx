import { FC, useEffect, useRef, useState } from 'react';
import useI18 from '../../../i18n/hooks';
import * as echarts from 'echarts';
import { windowResizeObserver } from '../../../services/global.services';

import './home.scss';
import { timer } from 'rxjs';
import { changeSeconds, formatTime } from '../../../tools';
import { switchMap } from 'rxjs/operators';
import { fetchData } from '../../../tools/ajax';

export const DayTransactionVolume: FC = () => {
  const transactionVolume = useI18('transactionVolume');
  const box = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();
  const [data, setData] = useState<{time: string, volume: string}[]>([]);

  useEffect(() => {
    const subOption = timer(0, changeSeconds(5)).pipe(switchMap(() => fetchData('GET', '/kline'))).subscribe(data => {
      if (data.success) setData(data.data.map((item: any) => ({
        time: formatTime(item.time, 'hh:mm:ss'),
        volume: `${item.tx_num || 0}`
      })));
    });
    return () => subOption.unsubscribe();
  }, []);

  useEffect(() => {
    if (myChart.current) {
      const xAxisArr: string[] = [];
      const seriesArr: string[] = [];
      data.forEach(item => {
        xAxisArr.push(item.time);
        seriesArr.push(item.volume);
      });
      myChart.current.setOption({
        tooltip: {
          padding: [2, 5],
          formatter: `{b}<br />${transactionVolume}: {c}`
        },
        xAxis: {
          data: xAxisArr,
        },
        series: [{
          data: seriesArr,
        }],
      });
    }
  }, [data, transactionVolume]);

  useEffect(() => {
    if (!box.current) return;
    myChart.current = echarts.init(box.current);
    myChart.current.setOption({
      xAxis: {
        type: 'category',
        boundaryGap: false,
      },
      tooltip: {
        trigger: 'axis',
      },
      yAxis: {
        type: 'value',
        splitNumber: 3,
        minInterval: 1,
      },
      series: [{
        type: 'line',
        lineStyle: {
          color: '#1da390',
          width: 2,
        },
        areaStyle: {
          color: '#1da390',
          opacity: 0.1,
        },
        smooth: true,
        symbol: 'none',
      }],
      grid: {
        top: 10,
        bottom: 20,
        right: 20,
        left: 40,
      }
    });
    windowResizeObserver.subscribe(() => myChart.current?.resize());
  }, []);
  return <div ref={box} className="chain_view_box"></div>
};

export const TokenPledgeRate: FC<{ pledgeRate: number }> = ({ pledgeRate }) => {
  const box = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();

  useEffect(() => {
    if (!box.current) return;
    if (!myChart.current) {
      myChart.current = echarts.init(box.current);
    }
    myChart.current.setOption({
      grid: {
        top: 0,
        left: 0,
        width: 0,
        bottom: 0,
      },
      series: [{
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        pointer: {
          show: false
        },
        progress: {
          show: true,
          overlap: false,
          clip: false,
          itemStyle: {
            color: '#00b464',
            backgroundColor: '#edf0f2'
          }
        },
        axisLine: {
          lineStyle: {
            width: 2,
          }
        },
        splitLine: {
          show: false,
          distance: 0,
          length: 10,
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          show: false,
          distance: 50
        },
        data: [{
          value: pledgeRate,
          title: {
            offsetCenter: ['0', '0']
          },
          detail: {
            offsetCenter: ['0', '0']
          }
        }],
        title: {
          fontSize: 12
        },
        detail: {
          width: 50,
          fontSize: 12,
          color: '#878e9f',
          formatter: '{value}%'
        }
      }]
    });
    windowResizeObserver.subscribe(() => myChart.current?.resize());
  }, [pledgeRate]);
  return (
    <div ref={box} className="chain_info_view_rate"></div>
  );
};